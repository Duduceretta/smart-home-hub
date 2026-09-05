using System.Net.Sockets;
using System.Security.Cryptography;
using Microsoft.Extensions.Logging;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Domain.Common.Primitives;

namespace SmartHomeHub.Infrastructure.Tuya;

// Divisão em TuyaDeviceLockCoordinator, TuyaIpResolver, TuyaDataPointResolver e
// TuyaLightCommandCoalescer (ver backend-audit-2026-09-05.md, seção 05) —
// extração mecânica de responsabilidades que já viviam aqui, sem mudança de
// comportamento. Esta classe remanescente orquestra as quatro via composição
// interna (não registradas separadamente no container de DI) e continua
// expondo ITuyaLocalControlService sem alteração de contrato.
public sealed class TuyaLocalControlService : ITuyaLocalControlService
{
    // Chamada síncrona dentro do handler HTTP — sem limite próprio, uma lâmpada
    // presente na rede mas que não responde prenderia a requisição pelo timeout
    // de TCP do SO (bem mais longo que aceitável). Cada etapa de rede usa este budget.
    private static readonly TimeSpan OperationTimeout = TimeSpan.FromSeconds(3);

    private readonly ITuyaProtocolClientFactory protocolClientFactory;
    private readonly ILogger<TuyaLocalControlService> logger;

    // Timeout de aquisição bem mais curto, exclusivo do caminho de POLLING
    // periódico (TuyaDeviceStatePollingWorker) — usa o MESMO lock por
    // dispositivo (nunca colide com uma escrita de usuário no mesmo socket),
    // mas uma consulta de sincronização de estado NUNCA pode competir de
    // verdade com um comando real: se o lock não estiver livre quase
    // imediatamente, pula esse dispositivo neste ciclo (Device.Busy) em vez de
    // esperar — há um próximo ciclo em ~12s, não é uma leitura crítica. Bem
    // menor que os 10s do caminho de escrita, que aceita esperar mais porque é
    // uma ação direta do usuário.
    private readonly TimeSpan _pollingSemaphoreAcquireTimeout;

    private readonly TuyaDeviceLockCoordinator _lockCoordinator;
    private readonly TuyaIpResolver _ipResolver;

    // Usado só pelos setters de luz (SetBrightnessAsync/SetColorAsync/
    // SetColorTempAsync) abaixo, pra resolver o "último vence" por campo
    // quando vários comandos concorrentes chegam na mesma janela de
    // coalescência — ver TuyaLightCommandCoalescer.
    private long _batchSequence;

    // Recebe por delegate ResolveIpAndStatusAsync e TryWithTimeoutAsync (ambos
    // definidos mais abaixo nesta mesma classe) — evita duplicar essa lógica de
    // rede no coalescedor, que só orquestra o agrupamento dos comandos. Reusa a
    // MESMA instância de _lockCoordinator usada pelas demais operações — o
    // ponto inteiro do lock por device é serializar TODAS as operações
    // (power/workmode/luz) contra o mesmo dispositivo, não só um subconjunto.
    private readonly TuyaLightCommandCoalescer _lightCommandCoalescer;

    public TuyaLocalControlService(
        ITuyaProtocolClientFactory protocolClientFactory,
        ITuyaUdpDiscoveryScanner ipDiscoveryScanner,
        ILogger<TuyaLocalControlService> logger,
        // Seam de teste: timeout de aquisição do semáforo menor, pra não deixar
        // o teste de "Device.Busy" esperando 10s de verdade. Produção usa o default.
        TimeSpan? semaphoreAcquireTimeoutForTests = null,
        // Seam de teste: janela de coalescência menor, pra não deixar os testes
        // de rajada esperando dezenas de ms de verdade a mais que o necessário.
        TimeSpan? coalescingWindowForTests = null,
        // Seam de teste: janela do circuit breaker de resolução de IP menor,
        // pra não deixar o teste de "janela expira e tenta de novo" esperando
        // 10s de verdade. Produção usa o default.
        TimeSpan? ipResolutionCircuitBreakerWindowForTests = null,
        // Seam de teste: timeout de aquisição do semáforo para POLLING menor,
        // pra não deixar o teste de "pula ciclo se ocupado" esperando de verdade.
        // Produção usa o default.
        TimeSpan? pollingSemaphoreAcquireTimeoutForTests = null
    )
    {
        this.protocolClientFactory = protocolClientFactory;
        this.logger = logger;
        _pollingSemaphoreAcquireTimeout =
            pollingSemaphoreAcquireTimeoutForTests ?? TimeSpan.FromSeconds(2);
        _lockCoordinator = new TuyaDeviceLockCoordinator(logger, semaphoreAcquireTimeoutForTests);
        _ipResolver = new TuyaIpResolver(
            ipDiscoveryScanner,
            logger,
            ipResolutionCircuitBreakerWindowForTests
        );
        _lightCommandCoalescer = new TuyaLightCommandCoalescer(
            protocolClientFactory,
            _lockCoordinator,
            ResolveIpAndStatusAsync,
            TryWithTimeoutAsync<IReadOnlyDictionary<int, object?>>,
            logger,
            coalescingWindowForTests
        );
    }

    public void PruneExpiredSessions()
    {
        protocolClientFactory.PruneExpiredSessions();
    }

    public Task<Result<TuyaCommandOutcome>> SetPowerStateAsync(
        TuyaDeviceConnectionInfo connection,
        bool desiredState,
        CancellationToken cancellationToken
    ) =>
        _lockCoordinator.WithDeviceLockAsync(
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
            ipAddress = await _ipResolver.TryResolveIpAsync(
                connection.TuyaDeviceId,
                cancellationToken
            );
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

            var rediscoveredIp = await _ipResolver.TryResolveIpAsync(
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

        var resolvedDp = TuyaDataPointResolver.ResolveDp(
            connection.DpsPowerKey,
            status,
            connection.TuyaDeviceId
        );
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

    public Task<Result<TuyaBrightnessCommandOutcome>> SetBrightnessAsync(
        TuyaDeviceConnectionInfo connection,
        int brightnessPercent,
        CancellationToken cancellationToken
    )
    {
        var tcs = new TaskCompletionSource<Result<TuyaBrightnessCommandOutcome>>(
            TaskCreationOptions.RunContinuationsAsynchronously
        );

        _lightCommandCoalescer.EnqueueLightAdjustment(
            connection,
            batch =>
            {
                batch.BrightnessPercent = brightnessPercent;
                batch.BrightnessSeq = Interlocked.Increment(ref _batchSequence);
                batch.BrightnessWaiters.Add(tcs);
            }
        );

        return TuyaLightCommandCoalescer.AwaitWithCancellation(tcs, cancellationToken);
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

        _lightCommandCoalescer.EnqueueLightAdjustment(
            connection,
            batch =>
            {
                batch.ColorHex = colorHex;
                batch.ColorSeq = Interlocked.Increment(ref _batchSequence);
                batch.ColorWaiters.Add(tcs);
            }
        );

        return TuyaLightCommandCoalescer.AwaitWithCancellation(tcs, cancellationToken);
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

        _lightCommandCoalescer.EnqueueLightAdjustment(
            connection,
            batch =>
            {
                batch.ColorTempPercent = colorTempPercent;
                batch.ColorTempSeq = Interlocked.Increment(ref _batchSequence);
                batch.ColorTempWaiters.Add(tcs);
            }
        );

        return TuyaLightCommandCoalescer.AwaitWithCancellation(tcs, cancellationToken);
    }

    public Task<Result<TuyaWorkModeCommandOutcome>> SetWorkModeAsync(
        TuyaDeviceConnectionInfo connection,
        string workMode,
        CancellationToken cancellationToken
    ) =>
        _lockCoordinator.WithDeviceLockAsync(
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

        var workModeDp = TuyaDataPointResolver.ResolveWorkModeDp(status);
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
        _lockCoordinator.WithDeviceLockAsync(
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

        var workModeDp = TuyaDataPointResolver.ResolveWorkModeDp(resolved.Value.Status);
        if (workModeDp is null)
            return Result.Success<string?>(null);

        return Result.Success(resolved.Value.Status[workModeDp.Value] as string);
    }

    // Timeout de aquisição CURTO (_pollingSemaphoreAcquireTimeout, não o
    // default do TuyaDeviceLockCoordinator) — ver comentário do campo. Se o
    // lock já estiver com um comando de usuário em andamento, falha rápido com
    // Device.Busy em vez de competir por ele; o worker de polling trata esse
    // código especificamente como "pula este dispositivo neste ciclo", não
    // como falha de dispositivo offline.
    public Task<Result<TuyaPollingOutcome>> GetStateForPollingAsync(
        TuyaDeviceConnectionInfo connection,
        CancellationToken cancellationToken
    ) =>
        _lockCoordinator.WithDeviceLockAsync(
            connection.TuyaDeviceId,
            () => GetStateForPollingCoreAsync(connection, cancellationToken),
            cancellationToken,
            acquireTimeoutOverride: _pollingSemaphoreAcquireTimeout
        );

    // Lê TODOS os atributos relevantes num único QueryStatusAsync (não um por
    // atributo) — o custo de rede já foi pago pra resolver power, reaproveitar
    // o mesmo `status` pra brilho/cor/temp. de cor é gratuito. Brilho/cor/temp.
    // de cor null significa "DP não resolvido pra este device" — pode ser
    // categoria sem esse atributo (ex: tomada simples não tem DpsColorKey
    // configurada, então ResolveColorDp nunca acha nada no status), não erro.
    private async Task<Result<TuyaPollingOutcome>> GetStateForPollingCoreAsync(
        TuyaDeviceConnectionInfo connection,
        CancellationToken cancellationToken
    )
    {
        var protocolClient = protocolClientFactory.Resolve(connection.ProtocolVersion);

        var resolved = await ResolveIpAndStatusAsync(connection, protocolClient, cancellationToken);
        if (resolved.IsFailure)
            return Result.Failure<TuyaPollingOutcome>(resolved.Error);

        var (_, resolvedIp, status) = resolved.Value;

        var resolvedDp = TuyaDataPointResolver.ResolveDp(
            connection.DpsPowerKey,
            status,
            connection.TuyaDeviceId
        );
        if (resolvedDp is null)
        {
            return Result.Failure<TuyaPollingOutcome>(
                new Error(
                    "Device.NoBooleanDp",
                    "Não foi possível identificar o Data Point de liga/desliga deste dispositivo Tuya."
                )
            );
        }

        var isOn = status[resolvedDp.Value] as bool? ?? false;
        var resolvedDpString =
            connection.DpsPowerKey == resolvedDp.Value.ToString()
                ? null
                : resolvedDp.Value.ToString();

        // Cor: reportada sempre que o DP resolver, independente do work_mode
        // atual — o dispositivo mantém o último HSV conhecido mesmo em modo
        // branco, e a UI já trata ColorHex como "última cor conhecida", não
        // "cor ativa agora" (mesmo racional do caminho de escrita).
        string? colorHex = null;
        var colorDp = TuyaDataPointResolver.ResolveColorDp(connection.DpsColorKey, status);
        if (colorDp is not null && status[colorDp.Value] is string colorDpValue)
        {
            colorHex = TuyaColorConverter.DpValueToHexColor(colorDpValue);
        }

        // Brilho: em modo colorido o brilho "mora" no componente V do HSV, não
        // no DP de brilho branco (mesma distinção já feita na escrita, ver
        // TuyaLightCommandCoalescer.ExecuteLightAdjustmentBatchAsync) — ler
        // direto o DP de brilho nesse modo devolveria um valor obsoleto/errado.
        int? brightnessPercent = null;
        var workModeDp = TuyaDataPointResolver.ResolveWorkModeDp(status);
        var isColourMode = workModeDp is not null && status[workModeDp.Value] as string == "colour";

        if (isColourMode && colorDp is not null && status[colorDp.Value] is string hsvForBrightness)
        {
            brightnessPercent = TuyaColorConverter.DeviceBrightnessToPercent(
                TuyaColorConverter.ExtractHsvValueComponent(hsvForBrightness)
            );
        }
        else
        {
            var brightnessDp = TuyaDataPointResolver.ResolveNumericDp(
                connection.DpsBrightnessKey,
                status,
                TuyaDataPointResolver.DefaultBrightnessDp
            );
            if (
                brightnessDp is not null
                && status[brightnessDp.Value] is double brightnessDeviceValue
            )
            {
                brightnessPercent = TuyaColorConverter.DeviceBrightnessToPercent(
                    (int)brightnessDeviceValue
                );
            }
        }

        int? colorTempPercent = null;
        var colorTempDp = TuyaDataPointResolver.ResolveNumericDp(
            connection.DpsColorTempKey,
            status,
            TuyaDataPointResolver.DefaultColorTempDp
        );
        if (colorTempDp is not null && status[colorTempDp.Value] is double colorTempDeviceValue)
        {
            colorTempPercent = TuyaColorConverter.DeviceColorTempToPercent(
                (int)colorTempDeviceValue
            );
        }

        return Result.Success(
            new TuyaPollingOutcome(
                isOn,
                brightnessPercent,
                colorHex,
                colorTempPercent,
                resolvedIp,
                resolvedDpString
            )
        );
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
            ipAddress = await _ipResolver.TryResolveIpAsync(
                connection.TuyaDeviceId,
                cancellationToken
            );
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

            var rediscoveredIp = await _ipResolver.TryResolveIpAsync(
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
}
