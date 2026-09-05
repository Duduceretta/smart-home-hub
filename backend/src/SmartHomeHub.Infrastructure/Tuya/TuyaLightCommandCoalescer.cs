using Microsoft.Extensions.Logging;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Domain.Common.Primitives;

namespace SmartHomeHub.Infrastructure.Tuya;

/// <summary>
/// Coalescência de comandos de ajuste de luz (brilho/cor/temperatura) por
/// dispositivo: o lock por device (TuyaDeviceLockCoordinator) já resolve a
/// corrida de dados (leitura obsoleta), mas sozinho ainda serializa — uma
/// rajada de N comandos pro mesmo device continua pagando N handshakes TCP
/// completos sequenciais contra um microcontrolador que só aguenta 1-2 conexões
/// concorrentes e precisa de tempo de recuperação entre elas. A coalescência
/// funde comandos que chegam dentro da mesma janela curta num único ciclo de
/// Query+Set — acontece ANTES de adquirir o lock (agrupando o que será
/// enviado), nunca compete com ele. Ver iot-drivers.md, seção "Driver Local
/// Tuya (TCP)", pro racional completo da janela escolhida.
///
/// Extraído de TuyaLocalControlService (ver backend-audit-2026-09-05.md, seção
/// 05) — extração mecânica, mesma lógica. Depende do lock por device (injetado,
/// não duplicado) e recebe por delegate as duas operações de rede que
/// permanecem em TuyaLocalControlService (resolução de IP+status e o wrapper
/// de timeout/tratamento de exceção de rede), evitando duplicar essa lógica.
/// </summary>
internal sealed class TuyaLightCommandCoalescer(
    ITuyaProtocolClientFactory protocolClientFactory,
    TuyaDeviceLockCoordinator deviceLockCoordinator,
    Func<
        TuyaDeviceConnectionInfo,
        ITuyaProtocolClient,
        CancellationToken,
        Task<
            Result<(string IpAddress, string? ResolvedIp, IReadOnlyDictionary<int, object?> Status)>
        >
    > resolveIpAndStatusAsync,
    Func<
        Func<CancellationToken, Task<IReadOnlyDictionary<int, object?>>>,
        string,
        string,
        CancellationToken,
        Task<Result<IReadOnlyDictionary<int, object?>>>
    > tryWithTimeoutAsync,
    ILogger logger,
    // Seam de teste: janela de coalescência menor, pra não deixar os testes de
    // rajada esperando dezenas de ms de verdade a mais que o necessário.
    TimeSpan? coalescingWindowForTests = null
)
{
    private readonly TimeSpan _coalescingWindow =
        coalescingWindowForTests ?? TimeSpan.FromMilliseconds(75);
    private readonly object _batchLock = new();
    private readonly Dictionary<string, PendingLightAdjustment> _pendingBatches = new();

    // Lote pendente de ajustes de luz por dispositivo. Cada campo (brilho/cor/
    // temperatura) guarda só o valor MAIS RECENTE recebido na janela atual
    // (last-value-wins) + a lista de callers esperando o resultado desse
    // campo especificamente — vários callers do mesmo campo na mesma janela
    // recebem o MESMO resultado final (só o último valor foi de fato escrito).
    // O número de sequência por campo resolve o "último vence" também pro DP
    // de work_mode derivado, quando cor e temperatura de cor chegam juntas.
    public sealed class PendingLightAdjustment
    {
        public TuyaDeviceConnectionInfo Connection = null!;

        public int? BrightnessPercent;
        public long BrightnessSeq;
        public readonly List<
            TaskCompletionSource<Result<TuyaBrightnessCommandOutcome>>
        > BrightnessWaiters = [];

        public string? ColorHex;
        public long ColorSeq;
        public readonly List<TaskCompletionSource<Result<TuyaColorCommandOutcome>>> ColorWaiters =
        [];

        public int? ColorTempPercent;
        public long ColorTempSeq;
        public readonly List<
            TaskCompletionSource<Result<TuyaColorTempCommandOutcome>>
        > ColorTempWaiters = [];
    }

    // Funde o campo desta chamada no lote pendente do dispositivo (criando um
    // lote novo se não houver um em andamento) e agenda o flush só na criação
    // — chamadas subsequentes na mesma janela só atualizam o lote já agendado.
    public void EnqueueLightAdjustment(
        TuyaDeviceConnectionInfo connection,
        Action<PendingLightAdjustment> mergeField
    )
    {
        bool isNewBatch;

        lock (_batchLock)
        {
            if (!_pendingBatches.TryGetValue(connection.TuyaDeviceId, out var batch))
            {
                batch = new PendingLightAdjustment();
                _pendingBatches[connection.TuyaDeviceId] = batch;
                isNewBatch = true;
            }
            else
            {
                isNewBatch = false;
            }

            batch.Connection = connection;
            mergeField(batch);
        }

        if (isNewBatch)
        {
            _ = Task.Run(async () =>
            {
                await Task.Delay(_coalescingWindow);
                await FlushBatchAsync(connection.TuyaDeviceId);
            });
        }
    }

    // O caller individual pode desistir de esperar (ex: HTTP request abortado)
    // sem afetar os outros waiters do mesmo lote — o flush continua e completa
    // normalmente pra quem ainda está esperando; só este `tcs` específico é
    // cancelado do lado de quem chamou.
    public static Task<Result<TOutcome>> AwaitWithCancellation<TOutcome>(
        TaskCompletionSource<Result<TOutcome>> tcs,
        CancellationToken cancellationToken
    )
    {
        if (cancellationToken.CanBeCanceled)
        {
            var registration = cancellationToken.Register(() =>
                tcs.TrySetCanceled(cancellationToken)
            );
            _ = tcs.Task.ContinueWith(
                _ => registration.Dispose(),
                CancellationToken.None,
                TaskContinuationOptions.ExecuteSynchronously,
                TaskScheduler.Default
            );
        }

        return tcs.Task;
    }

    private async Task FlushBatchAsync(string tuyaDeviceId)
    {
        PendingLightAdjustment? batch;
        lock (_batchLock)
        {
            if (!_pendingBatches.Remove(tuyaDeviceId, out batch))
            {
                return; // defensivo — não deveria acontecer (um flush por lote criado).
            }
        }

        try
        {
            // Reutiliza o mesmo lock por dispositivo — a coalescência junta
            // o que será enviado ANTES de chegar aqui; a execução em si continua
            // atômica em relação a SetPowerStateAsync/SetWorkModeAsync/
            // GetWorkModeAsync no mesmo device, exatamente como antes.
            var lockResult = await deviceLockCoordinator.WithDeviceLockAsync(
                tuyaDeviceId,
                () => ExecuteLightAdjustmentBatchAsync(batch),
                CancellationToken.None
            );

            if (lockResult.IsFailure)
            {
                // Só acontece se nem conseguiu adquirir o lock (Device.Busy)
                // — ExecuteLightAdjustmentBatchAsync sempre completa os waiters
                // internamente e nunca propaga falha pra fora dele mesmo.
                CompleteAllWaiters(batch, lockResult.Error);
            }
        }
        catch (Exception ex)
        {
            // Nenhum waiter seria completado sem isso, travando os callers pra
            // sempre — mesmo racional do supervisor do MqttService.
            logger.LogCritical(
                ex,
                "Falha inesperada ao processar lote de comandos coalescidos do dispositivo Tuya {DeviceId}",
                tuyaDeviceId
            );
            CompleteAllWaiters(
                batch,
                new Error("Device.CommunicationError", "Falha ao comunicar com o dispositivo Tuya.")
            );
        }
    }

    // Executa 1 QueryStatusAsync + no máximo 1 SetDpsAsync pro lote inteiro —
    // o ganho central da coalescência. Processa os campos presentes em ordem
    // de CHEGADA (não em ordem fixa de tipo), cada um vendo o efeito dos
    // anteriores no mesmo lote (via `effectiveStatus` mutável), igual
    // aconteceria se cada comando tivesse executado sozinho em sequência —
    // isso resolve corretamente o "último vence" também pro DP de work_mode
    // derivado quando cor e temperatura de cor chegam juntas. Falha de
    // resolução de DP (NoColorDp, cor inválida) é isolada por campo — não
    // aborta os outros campos do mesmo lote; só falha de rede no
    // QueryStatusAsync ou no SetDpsAsync combinado afeta o lote inteiro,
    // porque aí sim é uma única operação física compartilhada.
    private async Task<Result<bool>> ExecuteLightAdjustmentBatchAsync(PendingLightAdjustment batch)
    {
        var connection = batch.Connection;
        var protocolClient = protocolClientFactory.Resolve(connection.ProtocolVersion);

        var resolved = await resolveIpAndStatusAsync(
            connection,
            protocolClient,
            CancellationToken.None
        );
        if (resolved.IsFailure)
        {
            CompleteAllWaiters(batch, resolved.Error);
            return Result.Success(true);
        }

        var (ipAddress, resolvedIp, status) = resolved.Value;
        var effectiveStatus = new Dictionary<int, object?>(status);
        var dps = new Dictionary<int, object>();

        TuyaBrightnessCommandOutcome? brightnessOutcome = null;
        Error? brightnessError = null;
        TuyaColorCommandOutcome? colorOutcome = null;
        Error? colorError = null;
        TuyaColorTempCommandOutcome? colorTempOutcome = null;
        Error? colorTempError = null;

        var steps = new List<(long Seq, Action Apply)>();

        if (batch.BrightnessPercent is int brightnessPercent)
        {
            steps.Add(
                (
                    batch.BrightnessSeq,
                    () =>
                    {
                        var workModeDp = TuyaDataPointResolver.ResolveWorkModeDp(effectiveStatus);
                        var isColourMode =
                            workModeDp is not null
                            && effectiveStatus[workModeDp.Value] as string == "colour";

                        if (isColourMode)
                        {
                            var colorDp = TuyaDataPointResolver.ResolveColorDp(
                                connection.DpsColorKey,
                                effectiveStatus
                            );
                            if (colorDp is null)
                            {
                                brightnessError = new Error(
                                    "Device.NoColorDp",
                                    "Não foi possível identificar o Data Point de cor deste dispositivo Tuya."
                                );
                                return;
                            }

                            var existingColorValue = effectiveStatus[colorDp.Value] as string;
                            var newColorValue = TuyaColorConverter.ReplaceHsvValueComponent(
                                existingColorValue,
                                brightnessPercent
                            );
                            dps[colorDp.Value] = newColorValue;
                            effectiveStatus[colorDp.Value] = newColorValue;
                            brightnessOutcome = new TuyaBrightnessCommandOutcome(
                                resolvedIp,
                                ResolvedDpsBrightnessKey: null
                            );
                        }
                        else
                        {
                            var brightnessDp = TuyaDataPointResolver.ResolveNumericDp(
                                connection.DpsBrightnessKey,
                                effectiveStatus,
                                TuyaDataPointResolver.DefaultBrightnessDp
                            );
                            if (brightnessDp is null)
                            {
                                brightnessError = new Error(
                                    "Device.NoBrightnessDp",
                                    "Não foi possível identificar o Data Point de brilho deste dispositivo Tuya."
                                );
                                return;
                            }

                            var deviceValue = TuyaColorConverter.PercentToDeviceBrightness(
                                brightnessPercent
                            );
                            dps[brightnessDp.Value] = deviceValue;
                            effectiveStatus[brightnessDp.Value] = (double)deviceValue;

                            var resolvedDpString =
                                connection.DpsBrightnessKey == brightnessDp.Value.ToString()
                                    ? null
                                    : brightnessDp.Value.ToString();
                            brightnessOutcome = new TuyaBrightnessCommandOutcome(
                                resolvedIp,
                                resolvedDpString
                            );
                        }
                    }
                )
            );
        }

        if (batch.ColorHex is string colorHex)
        {
            steps.Add(
                (
                    batch.ColorSeq,
                    () =>
                    {
                        var colorDp = TuyaDataPointResolver.ResolveColorDp(
                            connection.DpsColorKey,
                            effectiveStatus
                        );
                        if (colorDp is null)
                        {
                            colorError = new Error(
                                "Device.NoColorDp",
                                "Não foi possível identificar o Data Point de cor deste dispositivo Tuya."
                            );
                            return;
                        }

                        string dpValue;
                        try
                        {
                            dpValue = TuyaColorConverter.HexColorToDpValue(colorHex);
                        }
                        catch (ArgumentException ex)
                        {
                            colorError = new Error("Device.InvalidColor", ex.Message);
                            return;
                        }

                        dps[colorDp.Value] = dpValue;
                        effectiveStatus[colorDp.Value] = dpValue;

                        var workModeDp = TuyaDataPointResolver.ResolveWorkModeDp(effectiveStatus);
                        if (workModeDp is not null)
                        {
                            dps[workModeDp.Value] = "colour";
                            effectiveStatus[workModeDp.Value] = "colour";
                        }

                        var resolvedDpString =
                            connection.DpsColorKey == colorDp.Value.ToString()
                                ? null
                                : colorDp.Value.ToString();
                        colorOutcome = new TuyaColorCommandOutcome(
                            resolvedIp,
                            resolvedDpString,
                            ResolvedSupportsColor: true
                        );
                    }
                )
            );
        }

        if (batch.ColorTempPercent is int colorTempPercent)
        {
            steps.Add(
                (
                    batch.ColorTempSeq,
                    () =>
                    {
                        var colorTempDp = TuyaDataPointResolver.ResolveNumericDp(
                            connection.DpsColorTempKey,
                            effectiveStatus,
                            TuyaDataPointResolver.DefaultColorTempDp
                        );
                        if (colorTempDp is null)
                        {
                            colorTempError = new Error(
                                "Device.NoColorTempDp",
                                "Não foi possível identificar o Data Point de temperatura de cor deste dispositivo Tuya."
                            );
                            return;
                        }

                        var deviceValue = TuyaColorConverter.PercentToDeviceColorTemp(
                            colorTempPercent
                        );
                        dps[colorTempDp.Value] = deviceValue;
                        effectiveStatus[colorTempDp.Value] = (double)deviceValue;

                        var workModeDp = TuyaDataPointResolver.ResolveWorkModeDp(effectiveStatus);
                        if (workModeDp is not null)
                        {
                            dps[workModeDp.Value] = "white";
                            effectiveStatus[workModeDp.Value] = "white";
                        }

                        var resolvedDpString =
                            connection.DpsColorTempKey == colorTempDp.Value.ToString()
                                ? null
                                : colorTempDp.Value.ToString();
                        colorTempOutcome = new TuyaColorTempCommandOutcome(
                            resolvedIp,
                            resolvedDpString
                        );
                    }
                )
            );
        }

        foreach (var (_, apply) in steps.OrderBy(step => step.Seq))
        {
            apply();
        }

        if (brightnessError is not null)
        {
            CompleteWaiters(
                batch.BrightnessWaiters,
                Result.Failure<TuyaBrightnessCommandOutcome>(brightnessError)
            );
        }

        if (colorError is not null)
        {
            CompleteWaiters(
                batch.ColorWaiters,
                Result.Failure<TuyaColorCommandOutcome>(colorError)
            );
        }

        if (colorTempError is not null)
        {
            CompleteWaiters(
                batch.ColorTempWaiters,
                Result.Failure<TuyaColorTempCommandOutcome>(colorTempError)
            );
        }

        if (dps.Count == 0)
        {
            // Todos os campos falharam na resolução de DP — nada pra escrever.
            return Result.Success(true);
        }

        // Se o SetDpsAsync abaixo falhar, o Error devolvido a cada campo é
        // genérico (Code/Description de rede, sem saber que veio de um lote
        // coalescido) — de propósito, pra não inflar o record Error com um
        // campo que só esse caminho usaria e que efeitos colaterais em outros
        // lugares que consomem Error genericamente. Esse log é quem carrega o
        // diagnóstico "quais campos estavam juntos" pra investigação futura.
        logger.LogInformation(
            "Lote coalescido do dispositivo Tuya {DeviceId}: campos={Fields}, DPs={Dps}",
            connection.TuyaDeviceId,
            string.Join(
                "+",
                new[]
                {
                    brightnessOutcome is not null ? "brightness" : null,
                    colorOutcome is not null ? "color" : null,
                    colorTempOutcome is not null ? "colorTemp" : null,
                }.Where(field => field is not null)
            ),
            string.Join(",", dps.Keys)
        );

        var setResult = await tryWithTimeoutAsync(
            ct =>
                protocolClient.SetDpsAsync(
                    ipAddress,
                    connection.TuyaDeviceId,
                    connection.LocalKey,
                    dps,
                    ct
                ),
            connection.TuyaDeviceId,
            ipAddress,
            CancellationToken.None
        );

        if (setResult.IsFailure)
        {
            // Falha de rede no write combinado atinge todo campo que já tinha
            // resolvido DP com sucesso — a escrita física é uma só.
            if (brightnessOutcome is not null)
            {
                CompleteWaiters(
                    batch.BrightnessWaiters,
                    Result.Failure<TuyaBrightnessCommandOutcome>(setResult.Error)
                );
            }

            if (colorOutcome is not null)
            {
                CompleteWaiters(
                    batch.ColorWaiters,
                    Result.Failure<TuyaColorCommandOutcome>(setResult.Error)
                );
            }

            if (colorTempOutcome is not null)
            {
                CompleteWaiters(
                    batch.ColorTempWaiters,
                    Result.Failure<TuyaColorTempCommandOutcome>(setResult.Error)
                );
            }

            return Result.Success(true);
        }

        if (brightnessOutcome is not null)
        {
            CompleteWaiters(batch.BrightnessWaiters, Result.Success(brightnessOutcome));
        }

        if (colorOutcome is not null)
        {
            CompleteWaiters(batch.ColorWaiters, Result.Success(colorOutcome));
        }

        if (colorTempOutcome is not null)
        {
            CompleteWaiters(batch.ColorTempWaiters, Result.Success(colorTempOutcome));
        }

        return Result.Success(true);
    }

    private static void CompleteWaiters<TOutcome>(
        List<TaskCompletionSource<Result<TOutcome>>> waiters,
        Result<TOutcome> result
    )
    {
        foreach (var waiter in waiters)
        {
            waiter.TrySetResult(result);
        }
    }

    private static void CompleteAllWaiters(PendingLightAdjustment batch, Error error)
    {
        CompleteWaiters(
            batch.BrightnessWaiters,
            Result.Failure<TuyaBrightnessCommandOutcome>(error)
        );
        CompleteWaiters(batch.ColorWaiters, Result.Failure<TuyaColorCommandOutcome>(error));
        CompleteWaiters(batch.ColorTempWaiters, Result.Failure<TuyaColorTempCommandOutcome>(error));
    }
}
