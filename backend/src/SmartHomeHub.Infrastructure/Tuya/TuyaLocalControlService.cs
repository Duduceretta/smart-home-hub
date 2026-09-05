using System.Collections.Concurrent;
using System.Net.Sockets;
using System.Security.Cryptography;
using Microsoft.Extensions.Logging;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Domain.Common.Primitives;

namespace SmartHomeHub.Infrastructure.Tuya;

public sealed class TuyaLocalControlService(
    ITuyaProtocolClientFactory protocolClientFactory,
    ITuyaUdpDiscoveryScanner ipDiscoveryScanner,
    ILogger<TuyaLocalControlService> logger,
    // Seam de teste: timeout de aquisição do semáforo menor, pra não deixar o
    // teste de "Device.Busy" esperando 10s de verdade. Produção usa o default.
    TimeSpan? semaphoreAcquireTimeoutForTests = null,
    // Seam de teste: janela de coalescência menor, pra não deixar os testes de
    // rajada esperando dezenas de ms de verdade a mais que o necessário.
    TimeSpan? coalescingWindowForTests = null,
    // Seam de teste: janela do circuit breaker de resolução de IP menor, pra
    // não deixar o teste de "janela expira e tenta de novo" esperando 10s de
    // verdade. Produção usa o default.
    TimeSpan? ipResolutionCircuitBreakerWindowForTests = null
) : ITuyaLocalControlService
{
    // Chamada síncrona dentro do handler HTTP — sem limite próprio, uma lâmpada
    // presente na rede mas que não responde prenderia a requisição pelo timeout
    // de TCP do SO (bem mais longo que aceitável). Cada etapa de rede usa este budget.
    private static readonly TimeSpan OperationTimeout = TimeSpan.FromSeconds(3);
    private static readonly TimeSpan IpResolutionTimeout = TimeSpan.FromSeconds(3);

    // O driver Tuya não reutiliza conexão — cada operação pública abre TCP novo
    // (query de status + set de DPs = 2 handshakes). Sem serialização por
    // dispositivo, duas operações concorrentes no MESMO device (ex: usuário
    // arrastando brilho e cor quase ao mesmo tempo) correm o risco real de uma
    // ler o status ANTES da outra escrever, decidindo com base em informação
    // obsoleta (ver auditoria de drivers IoT). Dispositivos DIFERENTES (IPs/
    // sockets diferentes) nunca competem pelo mesmo semáforo — o paralelismo
    // entre devices distintos continua livre.
    private readonly TimeSpan _semaphoreAcquireTimeout =
        semaphoreAcquireTimeoutForTests ?? TimeSpan.FromSeconds(10);
    private readonly ConcurrentDictionary<string, SemaphoreSlim> _deviceLocks = new();

    // Circuit breaker leve pra resolução de IP via broadcast UDP: um
    // dispositivo genuinamente offline (não é IP obsoleto por DHCP, é o
    // dispositivo mesmo fora do ar) faria TryResolveIpAsync esperar o
    // IpResolutionTimeout inteiro em TODA tentativa de comando, sem nunca ter
    // sucesso. Janela curta pra falhar rápido nas tentativas seguintes ao
    // mesmo device sem repetir o broadcast redundante, mas curta o bastante
    // pra não mascarar um device que voltou a ficar alcançável logo em
    // seguida. Dicionário separado do _deviceLocks acima — mecanismo
    // independente, não compete nem substitui a serialização por device já
    // existente. Ver database-iot.md, seção "Driver Local Tuya (TCP)", pro
    // racional completo da janela escolhida.
    private readonly TimeSpan _ipResolutionCircuitBreakerWindow =
        ipResolutionCircuitBreakerWindowForTests ?? TimeSpan.FromSeconds(10);
    private readonly ConcurrentDictionary<string, DateTime> _ipResolutionCircuitBreakerOpenUntil =
        new();

    // Coalescência de comandos de ajuste de luz (brilho/cor/temperatura) por
    // dispositivo: o semáforo acima já resolve a corrida de dados (leitura
    // obsoleta), mas sozinho ainda serializa — uma rajada de N comandos pro
    // mesmo device continua pagando N handshakes TCP completos sequenciais
    // contra um microcontrolador que só aguenta 1-2 conexões concorrentes e
    // precisa de tempo de recuperação entre elas. A coalescência funde
    // comandos que chegam dentro da mesma janela curta num único ciclo de
    // Query+Set — acontece ANTES de adquirir o semáforo (agrupando o que será
    // enviado), nunca compete com ele. Ver database-iot.md, seção "Driver
    // Local Tuya (TCP)", pro racional completo da janela escolhida.
    private readonly TimeSpan _coalescingWindow =
        coalescingWindowForTests ?? TimeSpan.FromMilliseconds(75);
    private readonly object _batchLock = new();
    private readonly Dictionary<string, PendingLightAdjustment> _pendingBatches = new();
    private long _batchSequence;

    // Lote pendente de ajustes de luz por dispositivo. Cada campo (brilho/cor/
    // temperatura) guarda só o valor MAIS RECENTE recebido na janela atual
    // (last-value-wins) + a lista de callers esperando o resultado desse
    // campo especificamente — vários callers do mesmo campo na mesma janela
    // recebem o MESMO resultado final (só o último valor foi de fato escrito).
    // O número de sequência por campo resolve o "último vence" também pro DP
    // de work_mode derivado, quando cor e temperatura de cor chegam juntas.
    private sealed class PendingLightAdjustment
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

    // Serializa toda a sequência query+decide+set de uma operação contra o
    // mesmo TuyaDeviceId, tornando-a atômica do ponto de vista de qualquer
    // outra operação no mesmo dispositivo. Timeout de aquisição próprio
    // (distinto do OperationTimeout de rede) — se uma operação anterior travar
    // por algum motivo inesperado, a próxima falha com "Device.Busy" em vez de
    // esperar indefinidamente.
    private async Task<Result<T>> WithDeviceLockAsync<T>(
        string tuyaDeviceId,
        Func<Task<Result<T>>> operation,
        CancellationToken cancellationToken
    )
    {
        var deviceLock = _deviceLocks.GetOrAdd(tuyaDeviceId, static _ => new SemaphoreSlim(1, 1));

        using var timeoutCts = new CancellationTokenSource(_semaphoreAcquireTimeout);
        using var linkedCts = CancellationTokenSource.CreateLinkedTokenSource(
            cancellationToken,
            timeoutCts.Token
        );

        try
        {
            await deviceLock.WaitAsync(linkedCts.Token);
        }
        catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            logger.LogWarning(
                "Timeout aguardando lock do dispositivo Tuya {DeviceId} — outra operação em andamento.",
                tuyaDeviceId
            );
            return Result.Failure<T>(
                new Error(
                    "Device.Busy",
                    "Dispositivo Tuya ocupado com outro comando. Tente novamente em instantes."
                )
            );
        }

        try
        {
            return await operation();
        }
        finally
        {
            deviceLock.Release();
        }
    }

    public Task<Result<TuyaCommandOutcome>> SetPowerStateAsync(
        TuyaDeviceConnectionInfo connection,
        bool desiredState,
        CancellationToken cancellationToken
    ) =>
        WithDeviceLockAsync(
            connection.TuyaDeviceId,
            () => SetPowerStateCoreAsync(connection, desiredState, cancellationToken),
            cancellationToken
        );

    private async Task<Result<TuyaCommandOutcome>> SetPowerStateCoreAsync(
        TuyaDeviceConnectionInfo connection,
        bool desiredState,
        CancellationToken cancellationToken
    )
    {
        var protocolClient = protocolClientFactory.Resolve(connection.ProtocolVersion);

        var ipAddress = connection.IpAddress;
        string? resolvedIp = null;

        if (string.IsNullOrWhiteSpace(ipAddress))
        {
            ipAddress = await TryResolveIpAsync(connection.TuyaDeviceId, cancellationToken);
            if (ipAddress is null)
            {
                return Result.Failure<TuyaCommandOutcome>(
                    new Error(
                        "Device.Offline",
                        "Não foi possível localizar o dispositivo Tuya na rede local."
                    )
                );
            }
            resolvedIp = ipAddress;
        }

        IReadOnlyDictionary<int, object?> status;
        var statusResult = await TryWithTimeoutAsync(
            ct =>
                protocolClient.QueryStatusAsync(
                    ipAddress,
                    connection.TuyaDeviceId,
                    connection.LocalKey,
                    ct
                ),
            connection.TuyaDeviceId,
            ipAddress,
            cancellationToken
        );

        if (statusResult.IsFailure)
        {
            // Timeout pode significar IP obsoleto (DHCP mudou) — tenta redescobrir uma vez.
            if (statusResult.Error.Code != "Device.Offline")
            {
                return Result.Failure<TuyaCommandOutcome>(statusResult.Error);
            }

            var rediscoveredIp = await TryResolveIpAsync(
                connection.TuyaDeviceId,
                cancellationToken
            );
            if (rediscoveredIp is null || rediscoveredIp == ipAddress)
            {
                return Result.Failure<TuyaCommandOutcome>(statusResult.Error);
            }

            ipAddress = rediscoveredIp;
            resolvedIp = rediscoveredIp;

            statusResult = await TryWithTimeoutAsync(
                ct =>
                    protocolClient.QueryStatusAsync(
                        ipAddress,
                        connection.TuyaDeviceId,
                        connection.LocalKey,
                        ct
                    ),
                connection.TuyaDeviceId,
                ipAddress,
                cancellationToken
            );

            if (statusResult.IsFailure)
            {
                return Result.Failure<TuyaCommandOutcome>(statusResult.Error);
            }
        }

        status = statusResult.Value;

        var resolvedDp = ResolveDp(connection.DpsPowerKey, status, connection.TuyaDeviceId);
        if (resolvedDp is null)
        {
            return Result.Failure<TuyaCommandOutcome>(
                new Error(
                    "Device.NoBooleanDp",
                    "Não foi possível identificar o Data Point de liga/desliga deste dispositivo Tuya."
                )
            );
        }

        var setResult = await TryWithTimeoutAsync(
            ct =>
                protocolClient.SetDpAsync(
                    ipAddress,
                    connection.TuyaDeviceId,
                    connection.LocalKey,
                    resolvedDp.Value,
                    desiredState,
                    ct
                ),
            connection.TuyaDeviceId,
            ipAddress,
            cancellationToken
        );

        if (setResult.IsFailure)
        {
            return Result.Failure<TuyaCommandOutcome>(setResult.Error);
        }

        var confirmedIsOn =
            setResult.Value.TryGetValue(resolvedDp.Value, out var confirmedValue)
            && confirmedValue is bool confirmedBool
                ? confirmedBool
                : desiredState;

        var resolvedDpString =
            connection.DpsPowerKey == resolvedDp.Value.ToString()
                ? null
                : resolvedDp.Value.ToString();

        return Result.Success(new TuyaCommandOutcome(confirmedIsOn, resolvedIp, resolvedDpString));
    }

    private static int? ResolveDp(
        string? configuredDp,
        IReadOnlyDictionary<int, object?> status,
        string tuyaDeviceId
    )
    {
        if (
            int.TryParse(configuredDp, out var configured)
            && status.TryGetValue(configured, out var configuredValue)
            && configuredValue is bool
        )
        {
            return configured;
        }

        var booleanDps = status.Where(kv => kv.Value is bool).Select(kv => kv.Key).ToArray();

        return booleanDps.Length > 0 ? booleanDps[0] : null;
    }

    public Task<Result<TuyaBrightnessCommandOutcome>> SetBrightnessAsync(
        TuyaDeviceConnectionInfo connection,
        int brightnessPercent,
        CancellationToken cancellationToken
    )
    {
        var tcs = new TaskCompletionSource<Result<TuyaBrightnessCommandOutcome>>(
            TaskCreationOptions.RunContinuationsAsynchronously
        );

        EnqueueLightAdjustment(
            connection,
            batch =>
            {
                batch.BrightnessPercent = brightnessPercent;
                batch.BrightnessSeq = Interlocked.Increment(ref _batchSequence);
                batch.BrightnessWaiters.Add(tcs);
            }
        );

        return AwaitWithCancellation(tcs, cancellationToken);
    }

    public Task<Result<TuyaColorCommandOutcome>> SetColorAsync(
        TuyaDeviceConnectionInfo connection,
        string colorHex,
        CancellationToken cancellationToken
    )
    {
        var tcs = new TaskCompletionSource<Result<TuyaColorCommandOutcome>>(
            TaskCreationOptions.RunContinuationsAsynchronously
        );

        EnqueueLightAdjustment(
            connection,
            batch =>
            {
                batch.ColorHex = colorHex;
                batch.ColorSeq = Interlocked.Increment(ref _batchSequence);
                batch.ColorWaiters.Add(tcs);
            }
        );

        return AwaitWithCancellation(tcs, cancellationToken);
    }

    public Task<Result<TuyaColorTempCommandOutcome>> SetColorTempAsync(
        TuyaDeviceConnectionInfo connection,
        int colorTempPercent,
        CancellationToken cancellationToken
    )
    {
        var tcs = new TaskCompletionSource<Result<TuyaColorTempCommandOutcome>>(
            TaskCreationOptions.RunContinuationsAsynchronously
        );

        EnqueueLightAdjustment(
            connection,
            batch =>
            {
                batch.ColorTempPercent = colorTempPercent;
                batch.ColorTempSeq = Interlocked.Increment(ref _batchSequence);
                batch.ColorTempWaiters.Add(tcs);
            }
        );

        return AwaitWithCancellation(tcs, cancellationToken);
    }

    // Funde o campo desta chamada no lote pendente do dispositivo (criando um
    // lote novo se não houver um em andamento) e agenda o flush só na criação
    // — chamadas subsequentes na mesma janela só atualizam o lote já agendado.
    private void EnqueueLightAdjustment(
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
    private static Task<Result<TOutcome>> AwaitWithCancellation<TOutcome>(
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
            // Reutiliza o mesmo semáforo por dispositivo — a coalescência junta
            // o que será enviado ANTES de chegar aqui; a execução em si continua
            // atômica em relação a SetPowerStateAsync/SetWorkModeAsync/
            // GetWorkModeAsync no mesmo device, exatamente como antes.
            var lockResult = await WithDeviceLockAsync(
                tuyaDeviceId,
                () => ExecuteLightAdjustmentBatchAsync(batch),
                CancellationToken.None
            );

            if (lockResult.IsFailure)
            {
                // Só acontece se nem conseguiu adquirir o semáforo (Device.Busy)
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

        var resolved = await ResolveIpAndStatusAsync(
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
                        var workModeDp = ResolveWorkModeDp(effectiveStatus);
                        var isColourMode =
                            workModeDp is not null
                            && effectiveStatus[workModeDp.Value] as string == "colour";

                        if (isColourMode)
                        {
                            var colorDp = ResolveColorDp(connection.DpsColorKey, effectiveStatus);
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
                            var brightnessDp = ResolveNumericDp(
                                connection.DpsBrightnessKey,
                                effectiveStatus,
                                DefaultBrightnessDp
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
                        var colorDp = ResolveColorDp(connection.DpsColorKey, effectiveStatus);
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

                        var workModeDp = ResolveWorkModeDp(effectiveStatus);
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
                        var colorTempDp = ResolveNumericDp(
                            connection.DpsColorTempKey,
                            effectiveStatus,
                            DefaultColorTempDp
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

                        var workModeDp = ResolveWorkModeDp(effectiveStatus);
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

        var setResult = await TryWithTimeoutAsync(
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

    public Task<Result<TuyaWorkModeCommandOutcome>> SetWorkModeAsync(
        TuyaDeviceConnectionInfo connection,
        string workMode,
        CancellationToken cancellationToken
    ) =>
        WithDeviceLockAsync(
            connection.TuyaDeviceId,
            () => SetWorkModeCoreAsync(connection, workMode, cancellationToken),
            cancellationToken
        );

    private async Task<Result<TuyaWorkModeCommandOutcome>> SetWorkModeCoreAsync(
        TuyaDeviceConnectionInfo connection,
        string workMode,
        CancellationToken cancellationToken
    )
    {
        var protocolClient = protocolClientFactory.Resolve(connection.ProtocolVersion);

        var resolved = await ResolveIpAndStatusAsync(connection, protocolClient, cancellationToken);
        if (resolved.IsFailure)
            return Result.Failure<TuyaWorkModeCommandOutcome>(resolved.Error);

        var (ipAddress, resolvedIp, status) = resolved.Value;

        var workModeDp = ResolveWorkModeDp(status);
        if (workModeDp is null)
        {
            return Result.Failure<TuyaWorkModeCommandOutcome>(
                new Error(
                    "Device.NoWorkModeDp",
                    "Não foi possível identificar o Data Point de modo deste dispositivo Tuya."
                )
            );
        }

        var setResult = await TryWithTimeoutAsync(
            ct =>
                protocolClient.SetDpsAsync(
                    ipAddress,
                    connection.TuyaDeviceId,
                    connection.LocalKey,
                    new Dictionary<int, object> { [workModeDp.Value] = workMode },
                    ct
                ),
            connection.TuyaDeviceId,
            ipAddress,
            cancellationToken
        );

        if (setResult.IsFailure)
            return Result.Failure<TuyaWorkModeCommandOutcome>(setResult.Error);

        return Result.Success(new TuyaWorkModeCommandOutcome(resolvedIp));
    }

    // Read-only (sem SetDpsAsync), mas ainda serializado contra o mesmo
    // dispositivo — evita ler status no meio de uma escrita concorrente de
    // outra operação e devolver um work_mode transitório/inconsistente.
    public Task<Result<string?>> GetWorkModeAsync(
        TuyaDeviceConnectionInfo connection,
        CancellationToken cancellationToken
    ) =>
        WithDeviceLockAsync(
            connection.TuyaDeviceId,
            () => GetWorkModeCoreAsync(connection, cancellationToken),
            cancellationToken
        );

    private async Task<Result<string?>> GetWorkModeCoreAsync(
        TuyaDeviceConnectionInfo connection,
        CancellationToken cancellationToken
    )
    {
        var protocolClient = protocolClientFactory.Resolve(connection.ProtocolVersion);

        var resolved = await ResolveIpAndStatusAsync(connection, protocolClient, cancellationToken);
        if (resolved.IsFailure)
            return Result.Failure<string?>(resolved.Error);

        var workModeDp = ResolveWorkModeDp(resolved.Value.Status);
        if (workModeDp is null)
            return Result.Success<string?>(null);

        return Result.Success(resolved.Value.Status[workModeDp.Value] as string);
    }

    private async Task<
        Result<(string IpAddress, string? ResolvedIp, IReadOnlyDictionary<int, object?> Status)>
    > ResolveIpAndStatusAsync(
        TuyaDeviceConnectionInfo connection,
        ITuyaProtocolClient protocolClient,
        CancellationToken cancellationToken
    )
    {
        var ipAddress = connection.IpAddress;
        string? resolvedIp = null;

        if (string.IsNullOrWhiteSpace(ipAddress))
        {
            ipAddress = await TryResolveIpAsync(connection.TuyaDeviceId, cancellationToken);
            if (ipAddress is null)
            {
                return Result.Failure<(string, string?, IReadOnlyDictionary<int, object?>)>(
                    new Error(
                        "Device.Offline",
                        "Não foi possível localizar o dispositivo Tuya na rede local."
                    )
                );
            }
            resolvedIp = ipAddress;
        }

        var statusResult = await TryWithTimeoutAsync(
            ct =>
                protocolClient.QueryStatusAsync(
                    ipAddress,
                    connection.TuyaDeviceId,
                    connection.LocalKey,
                    ct
                ),
            connection.TuyaDeviceId,
            ipAddress,
            cancellationToken
        );

        if (statusResult.IsFailure)
        {
            if (statusResult.Error.Code != "Device.Offline")
            {
                return Result.Failure<(string, string?, IReadOnlyDictionary<int, object?>)>(
                    statusResult.Error
                );
            }

            var rediscoveredIp = await TryResolveIpAsync(
                connection.TuyaDeviceId,
                cancellationToken
            );
            if (rediscoveredIp is null || rediscoveredIp == ipAddress)
            {
                return Result.Failure<(string, string?, IReadOnlyDictionary<int, object?>)>(
                    statusResult.Error
                );
            }

            ipAddress = rediscoveredIp;
            resolvedIp = rediscoveredIp;

            statusResult = await TryWithTimeoutAsync(
                ct =>
                    protocolClient.QueryStatusAsync(
                        ipAddress,
                        connection.TuyaDeviceId,
                        connection.LocalKey,
                        ct
                    ),
                connection.TuyaDeviceId,
                ipAddress,
                cancellationToken
            );

            if (statusResult.IsFailure)
            {
                return Result.Failure<(string, string?, IReadOnlyDictionary<int, object?>)>(
                    statusResult.Error
                );
            }
        }

        return Result.Success((ipAddress, resolvedIp, statusResult.Value));
    }

    // Fallbacks literais (não o default do property initializer de
    // DeviceConfiguration) — dispositivos cadastrados antes desses campos
    // existirem têm a chave ausente do JSON persistido, o que desserializa
    // como null, não como o default da classe (confirmado inspecionando a
    // coluna Configuration real no Postgres). Sem heurística segura de
    // "único DP numérico" (brilho/temp. de cor colidem entre si), então o
    // fallback é o valor fixo confirmado por diagnóstico manual, igual
    // documentado em DeviceConfiguration.cs.
    private const int DefaultBrightnessDp = 22;
    private const int DefaultColorTempDp = 23;

    private static int? ResolveNumericDp(
        string? configuredDp,
        IReadOnlyDictionary<int, object?> status,
        int defaultDp
    )
    {
        if (
            int.TryParse(configuredDp, out var configured)
            && status.TryGetValue(configured, out var configuredValue)
            && configuredValue is double
        )
        {
            return configured;
        }

        if (status.TryGetValue(defaultDp, out var defaultValue) && defaultValue is double)
        {
            return defaultDp;
        }

        return null;
    }

    private static int? ResolveColorDp(
        string? configuredDp,
        IReadOnlyDictionary<int, object?> status
    )
    {
        if (
            int.TryParse(configuredDp, out var configured)
            && status.TryGetValue(configured, out var configuredValue)
            && TuyaColorConverter.LooksLikeColorDpValue(configuredValue)
        )
        {
            return configured;
        }

        var candidate = status.FirstOrDefault(kv =>
            TuyaColorConverter.LooksLikeColorDpValue(kv.Value)
        );
        return candidate.Value is not null ? candidate.Key : null;
    }

    private static readonly HashSet<string> WorkModeValues = new(StringComparer.OrdinalIgnoreCase)
    {
        "white",
        "colour",
        "color",
        "scene",
        "music",
    };

    private static int? ResolveWorkModeDp(IReadOnlyDictionary<int, object?> status)
    {
        var candidate = status.FirstOrDefault(kv =>
            kv.Value is string text && WorkModeValues.Contains(text)
        );
        return candidate.Value is not null ? candidate.Key : null;
    }

    private async Task<Result<T>> TryWithTimeoutAsync<T>(
        Func<CancellationToken, Task<T>> operation,
        string tuyaDeviceId,
        string ipAddress,
        CancellationToken cancellationToken
    )
    {
        using var timeoutCts = new CancellationTokenSource(OperationTimeout);
        using var linkedCts = CancellationTokenSource.CreateLinkedTokenSource(
            cancellationToken,
            timeoutCts.Token
        );

        try
        {
            var result = await operation(linkedCts.Token);
            return Result.Success(result);
        }
        catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            logger.LogWarning(
                "Timeout ao comunicar com dispositivo Tuya {DeviceId} em {IpAddress}",
                tuyaDeviceId,
                ipAddress
            );
            return Result.Failure<T>(
                new Error("Device.Offline", "Dispositivo Tuya não respondeu (timeout).")
            );
        }
        catch (SocketException ex)
        {
            logger.LogWarning(
                ex,
                "Falha de conexão com dispositivo Tuya {DeviceId} em {IpAddress}",
                tuyaDeviceId,
                ipAddress
            );
            return Result.Failure<T>(
                new Error("Device.Offline", "Não foi possível conectar ao dispositivo Tuya.")
            );
        }
        catch (CryptographicException ex)
        {
            logger.LogWarning(
                ex,
                "Falha ao decodificar resposta do dispositivo Tuya {DeviceId} — local_key provavelmente inválida",
                tuyaDeviceId
            );
            return Result.Failure<T>(
                new Error(
                    "Device.InvalidLocalKey",
                    "A local_key configurada não é válida. Se o dispositivo foi repareado no app Tuya, extraia a local_key novamente."
                )
            );
        }
        catch (IOException ex)
        {
            // Lançada por ReceiveFrameAsync/ReadExactAsync quando a leitura do
            // stream retorna <= 0 — o dispositivo fechou a conexão TCP no meio
            // da operação (ex: tomada desligada fisicamente durante a escrita),
            // não um timeout nem um erro de socket na camada de conexão.
            logger.LogWarning(
                ex,
                "Conexão com dispositivo Tuya {DeviceId} em {IpAddress} foi encerrada pelo outro lado no meio da operação",
                tuyaDeviceId,
                ipAddress
            );
            return Result.Failure<T>(
                new Error(
                    "Device.ConnectionClosed",
                    "A conexão com o dispositivo Tuya foi encerrada antes da operação terminar."
                )
            );
        }
        catch (Exception ex)
        {
            logger.LogWarning(
                ex,
                "Falha inesperada ao comunicar com dispositivo Tuya {DeviceId}",
                tuyaDeviceId
            );
            return Result.Failure<T>(
                new Error("Device.CommunicationError", "Falha ao comunicar com o dispositivo Tuya.")
            );
        }
    }

    private async Task<string?> TryResolveIpAsync(
        string tuyaDeviceId,
        CancellationToken cancellationToken
    )
    {
        if (
            _ipResolutionCircuitBreakerOpenUntil.TryGetValue(tuyaDeviceId, out var openUntil)
            && DateTime.UtcNow < openUntil
        )
        {
            logger.LogDebug(
                "Circuit breaker de resolução de IP aberto pro dispositivo Tuya {DeviceId} — pulando broadcast UDP até {OpenUntil:o}.",
                tuyaDeviceId,
                openUntil
            );
            return null;
        }

        using var timeoutCts = new CancellationTokenSource(IpResolutionTimeout);
        using var linkedCts = CancellationTokenSource.CreateLinkedTokenSource(
            cancellationToken,
            timeoutCts.Token
        );

        try
        {
            await foreach (var discovered in ipDiscoveryScanner.ScanAsync(linkedCts.Token))
            {
                if (discovered.ExternalId == tuyaDeviceId && discovered.IpAddress is not null)
                {
                    // Sucesso a qualquer momento limpa o breaker imediatamente — não
                    // é um breaker permanente, só evita repetição redundante enquanto
                    // o device continua genuinamente inalcançável.
                    _ipResolutionCircuitBreakerOpenUntil.TryRemove(tuyaDeviceId, out _);
                    return discovered.IpAddress;
                }
            }
        }
        catch (OperationCanceledException)
        {
            // Timeout esperado — nenhum broadcast do dispositivo alvo chegou a tempo.
        }

        _ipResolutionCircuitBreakerOpenUntil[tuyaDeviceId] = DateTime.UtcNow.Add(
            _ipResolutionCircuitBreakerWindow
        );

        return null;
    }
}
