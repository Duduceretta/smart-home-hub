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
    TimeSpan? semaphoreAcquireTimeoutForTests = null
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
    ) =>
        WithDeviceLockAsync(
            connection.TuyaDeviceId,
            () => SetBrightnessCoreAsync(connection, brightnessPercent, cancellationToken),
            cancellationToken
        );

    private async Task<Result<TuyaBrightnessCommandOutcome>> SetBrightnessCoreAsync(
        TuyaDeviceConnectionInfo connection,
        int brightnessPercent,
        CancellationToken cancellationToken
    )
    {
        var protocolClient = protocolClientFactory.Resolve(connection.ProtocolVersion);

        var resolved = await ResolveIpAndStatusAsync(connection, protocolClient, cancellationToken);
        if (resolved.IsFailure)
            return Result.Failure<TuyaBrightnessCommandOutcome>(resolved.Error);

        var (ipAddress, resolvedIp, status) = resolved.Value;

        // Escrever o DP de brilho "branco" faz o hardware trocar sozinho pro
        // modo branco (confirmado por diagnóstico manual: DP21 mudou de
        // "colour" pra "white" só por causa do DP22 ser escrito, mesmo sem
        // pedir explicitamente). Em modo colorido, o brilho precisa virar o
        // componente V do DP de cor em vez disso, senão o brilho "vaza" e
        // troca a lâmpada de volta pro branco toda vez que o usuário arrasta
        // o slider na aba Cor.
        var workModeDp = ResolveWorkModeDp(status);
        var isColourMode = workModeDp is not null && status[workModeDp.Value] as string == "colour";

        if (isColourMode)
        {
            var colorDpInColourMode = ResolveColorDp(connection.DpsColorKey, status);
            if (colorDpInColourMode is null)
            {
                return Result.Failure<TuyaBrightnessCommandOutcome>(
                    new Error(
                        "Device.NoColorDp",
                        "Não foi possível identificar o Data Point de cor deste dispositivo Tuya."
                    )
                );
            }

            var existingColorValue = status[colorDpInColourMode.Value] as string;
            var newColorValue = TuyaColorConverter.ReplaceHsvValueComponent(
                existingColorValue,
                brightnessPercent
            );

            var colourSetResult = await TryWithTimeoutAsync(
                ct =>
                    protocolClient.SetDpsAsync(
                        ipAddress,
                        connection.TuyaDeviceId,
                        connection.LocalKey,
                        new Dictionary<int, object> { [colorDpInColourMode.Value] = newColorValue },
                        ct
                    ),
                connection.TuyaDeviceId,
                ipAddress,
                cancellationToken
            );

            if (colourSetResult.IsFailure)
                return Result.Failure<TuyaBrightnessCommandOutcome>(colourSetResult.Error);

            return Result.Success(
                new TuyaBrightnessCommandOutcome(resolvedIp, ResolvedDpsBrightnessKey: null)
            );
        }

        var brightnessDp = ResolveNumericDp(
            connection.DpsBrightnessKey,
            status,
            DefaultBrightnessDp
        );
        if (brightnessDp is null)
        {
            return Result.Failure<TuyaBrightnessCommandOutcome>(
                new Error(
                    "Device.NoBrightnessDp",
                    "Não foi possível identificar o Data Point de brilho deste dispositivo Tuya."
                )
            );
        }

        var deviceValue = TuyaColorConverter.PercentToDeviceBrightness(brightnessPercent);

        var setResult = await TryWithTimeoutAsync(
            ct =>
                protocolClient.SetDpsAsync(
                    ipAddress,
                    connection.TuyaDeviceId,
                    connection.LocalKey,
                    new Dictionary<int, object> { [brightnessDp.Value] = deviceValue },
                    ct
                ),
            connection.TuyaDeviceId,
            ipAddress,
            cancellationToken
        );

        if (setResult.IsFailure)
            return Result.Failure<TuyaBrightnessCommandOutcome>(setResult.Error);

        var resolvedDpString =
            connection.DpsBrightnessKey == brightnessDp.Value.ToString()
                ? null
                : brightnessDp.Value.ToString();

        return Result.Success(new TuyaBrightnessCommandOutcome(resolvedIp, resolvedDpString));
    }

    public Task<Result<TuyaColorCommandOutcome>> SetColorAsync(
        TuyaDeviceConnectionInfo connection,
        string colorHex,
        CancellationToken cancellationToken
    ) =>
        WithDeviceLockAsync(
            connection.TuyaDeviceId,
            () => SetColorCoreAsync(connection, colorHex, cancellationToken),
            cancellationToken
        );

    private async Task<Result<TuyaColorCommandOutcome>> SetColorCoreAsync(
        TuyaDeviceConnectionInfo connection,
        string colorHex,
        CancellationToken cancellationToken
    )
    {
        var protocolClient = protocolClientFactory.Resolve(connection.ProtocolVersion);

        var resolved = await ResolveIpAndStatusAsync(connection, protocolClient, cancellationToken);
        if (resolved.IsFailure)
            return Result.Failure<TuyaColorCommandOutcome>(resolved.Error);

        var (ipAddress, resolvedIp, status) = resolved.Value;

        var colorDp = ResolveColorDp(connection.DpsColorKey, status);
        if (colorDp is null)
        {
            return Result.Failure<TuyaColorCommandOutcome>(
                new Error(
                    "Device.NoColorDp",
                    "Não foi possível identificar o Data Point de cor deste dispositivo Tuya."
                )
            );
        }

        string dpValue;
        try
        {
            dpValue = TuyaColorConverter.HexColorToDpValue(colorHex);
        }
        catch (ArgumentException ex)
        {
            return Result.Failure<TuyaColorCommandOutcome>(
                new Error("Device.InvalidColor", ex.Message)
            );
        }

        var dps = new Dictionary<int, object> { [colorDp.Value] = dpValue };

        // Best-effort: se existir um DP de work_mode (string "white"/"colour"/...)
        // na resposta, seta junto pra "colour" — em bulbos reais, mudar só o DP de
        // colour_data sem trocar o modo pode não refletir visualmente (confirmado
        // por captura real: DP21 mudou de "white" pra "colour" junto com DP24
        // quando a cor foi trocada pelo app).
        var workModeDp = ResolveWorkModeDp(status);
        if (workModeDp is not null)
        {
            dps[workModeDp.Value] = "colour";
        }

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
            cancellationToken
        );

        if (setResult.IsFailure)
            return Result.Failure<TuyaColorCommandOutcome>(setResult.Error);

        var resolvedDpString =
            connection.DpsColorKey == colorDp.Value.ToString() ? null : colorDp.Value.ToString();

        return Result.Success(
            new TuyaColorCommandOutcome(resolvedIp, resolvedDpString, ResolvedSupportsColor: true)
        );
    }

    public Task<Result<TuyaColorTempCommandOutcome>> SetColorTempAsync(
        TuyaDeviceConnectionInfo connection,
        int colorTempPercent,
        CancellationToken cancellationToken
    ) =>
        WithDeviceLockAsync(
            connection.TuyaDeviceId,
            () => SetColorTempCoreAsync(connection, colorTempPercent, cancellationToken),
            cancellationToken
        );

    private async Task<Result<TuyaColorTempCommandOutcome>> SetColorTempCoreAsync(
        TuyaDeviceConnectionInfo connection,
        int colorTempPercent,
        CancellationToken cancellationToken
    )
    {
        var protocolClient = protocolClientFactory.Resolve(connection.ProtocolVersion);

        var resolved = await ResolveIpAndStatusAsync(connection, protocolClient, cancellationToken);
        if (resolved.IsFailure)
            return Result.Failure<TuyaColorTempCommandOutcome>(resolved.Error);

        var (ipAddress, resolvedIp, status) = resolved.Value;

        var colorTempDp = ResolveNumericDp(connection.DpsColorTempKey, status, DefaultColorTempDp);
        if (colorTempDp is null)
        {
            return Result.Failure<TuyaColorTempCommandOutcome>(
                new Error(
                    "Device.NoColorTempDp",
                    "Não foi possível identificar o Data Point de temperatura de cor deste dispositivo Tuya."
                )
            );
        }

        var deviceValue = TuyaColorConverter.PercentToDeviceColorTemp(colorTempPercent);

        var dps = new Dictionary<int, object> { [colorTempDp.Value] = deviceValue };

        // Temperatura de cor só se aplica no modo branco — força o work_mode
        // junto, mesmo racional de SetColorAsync forçar "colour".
        var workModeDp = ResolveWorkModeDp(status);
        if (workModeDp is not null)
        {
            dps[workModeDp.Value] = "white";
        }

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
            cancellationToken
        );

        if (setResult.IsFailure)
            return Result.Failure<TuyaColorTempCommandOutcome>(setResult.Error);

        var resolvedDpString =
            connection.DpsColorTempKey == colorTempDp.Value.ToString()
                ? null
                : colorTempDp.Value.ToString();

        return Result.Success(new TuyaColorTempCommandOutcome(resolvedIp, resolvedDpString));
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
                    return discovered.IpAddress;
                }
            }
        }
        catch (OperationCanceledException)
        {
            // Timeout esperado — nenhum broadcast do dispositivo alvo chegou a tempo.
        }

        return null;
    }
}
