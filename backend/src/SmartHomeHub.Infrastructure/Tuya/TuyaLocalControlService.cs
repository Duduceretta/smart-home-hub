using System.Net.Sockets;
using System.Security.Cryptography;
using Microsoft.Extensions.Logging;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Domain.Common.Primitives;

namespace SmartHomeHub.Infrastructure.Tuya;

public sealed class TuyaLocalControlService(
    ITuyaProtocolClientFactory protocolClientFactory,
    ITuyaUdpDiscoveryScanner ipDiscoveryScanner,
    ILogger<TuyaLocalControlService> logger
) : ITuyaLocalControlService
{
    // Chamada síncrona dentro do handler HTTP — sem limite próprio, uma lâmpada
    // presente na rede mas que não responde prenderia a requisição pelo timeout
    // de TCP do SO (bem mais longo que aceitável). Cada etapa de rede usa este budget.
    private static readonly TimeSpan OperationTimeout = TimeSpan.FromSeconds(3);
    private static readonly TimeSpan IpResolutionTimeout = TimeSpan.FromSeconds(3);

    public async Task<Result<TuyaCommandOutcome>> SetPowerStateAsync(
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
                    new Error("Device.Offline", "Não foi possível localizar o dispositivo Tuya na rede local.")
                );
            }
            resolvedIp = ipAddress;
        }

        IReadOnlyDictionary<int, object?> status;
        var statusResult = await TryWithTimeoutAsync(
            ct => protocolClient.QueryStatusAsync(ipAddress, connection.TuyaDeviceId, connection.LocalKey, ct),
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

            var rediscoveredIp = await TryResolveIpAsync(connection.TuyaDeviceId, cancellationToken);
            if (rediscoveredIp is null || rediscoveredIp == ipAddress)
            {
                return Result.Failure<TuyaCommandOutcome>(statusResult.Error);
            }

            ipAddress = rediscoveredIp;
            resolvedIp = rediscoveredIp;

            statusResult = await TryWithTimeoutAsync(
                ct => protocolClient.QueryStatusAsync(ipAddress, connection.TuyaDeviceId, connection.LocalKey, ct),
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
            ct => protocolClient.SetDpAsync(ipAddress, connection.TuyaDeviceId, connection.LocalKey, resolvedDp.Value, desiredState, ct),
            connection.TuyaDeviceId,
            ipAddress,
            cancellationToken
        );

        if (setResult.IsFailure)
        {
            return Result.Failure<TuyaCommandOutcome>(setResult.Error);
        }

        var confirmedIsOn =
            setResult.Value.TryGetValue(resolvedDp.Value, out var confirmedValue) && confirmedValue is bool confirmedBool
                ? confirmedBool
                : desiredState;

        var resolvedDpString = connection.DpsPowerKey == resolvedDp.Value.ToString() ? null : resolvedDp.Value.ToString();

        return Result.Success(new TuyaCommandOutcome(confirmedIsOn, resolvedIp, resolvedDpString));
    }

    private static int? ResolveDp(string? configuredDp, IReadOnlyDictionary<int, object?> status, string tuyaDeviceId)
    {
        if (int.TryParse(configuredDp, out var configured) && status.TryGetValue(configured, out var configuredValue)
            && configuredValue is bool)
        {
            return configured;
        }

        var booleanDps = status.Where(kv => kv.Value is bool).Select(kv => kv.Key).ToArray();

        return booleanDps.Length > 0 ? booleanDps[0] : null;
    }

    public async Task<Result<TuyaBrightnessCommandOutcome>> SetBrightnessAsync(
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

        var brightnessDp = ResolveNumericDp(connection.DpsBrightnessKey, status);
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
            ct => protocolClient.SetDpsAsync(
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
            connection.DpsBrightnessKey == brightnessDp.Value.ToString() ? null : brightnessDp.Value.ToString();

        return Result.Success(new TuyaBrightnessCommandOutcome(resolvedIp, resolvedDpString));
    }

    public async Task<Result<TuyaColorCommandOutcome>> SetColorAsync(
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
            return Result.Failure<TuyaColorCommandOutcome>(new Error("Device.InvalidColor", ex.Message));
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
            ct => protocolClient.SetDpsAsync(ipAddress, connection.TuyaDeviceId, connection.LocalKey, dps, ct),
            connection.TuyaDeviceId,
            ipAddress,
            cancellationToken
        );

        if (setResult.IsFailure)
            return Result.Failure<TuyaColorCommandOutcome>(setResult.Error);

        var resolvedDpString = connection.DpsColorKey == colorDp.Value.ToString() ? null : colorDp.Value.ToString();

        return Result.Success(new TuyaColorCommandOutcome(resolvedIp, resolvedDpString, ResolvedSupportsColor: true));
    }

    private async Task<Result<(string IpAddress, string? ResolvedIp, IReadOnlyDictionary<int, object?> Status)>> ResolveIpAndStatusAsync(
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
                    new Error("Device.Offline", "Não foi possível localizar o dispositivo Tuya na rede local.")
                );
            }
            resolvedIp = ipAddress;
        }

        var statusResult = await TryWithTimeoutAsync(
            ct => protocolClient.QueryStatusAsync(ipAddress, connection.TuyaDeviceId, connection.LocalKey, ct),
            connection.TuyaDeviceId,
            ipAddress,
            cancellationToken
        );

        if (statusResult.IsFailure)
        {
            if (statusResult.Error.Code != "Device.Offline")
            {
                return Result.Failure<(string, string?, IReadOnlyDictionary<int, object?>)>(statusResult.Error);
            }

            var rediscoveredIp = await TryResolveIpAsync(connection.TuyaDeviceId, cancellationToken);
            if (rediscoveredIp is null || rediscoveredIp == ipAddress)
            {
                return Result.Failure<(string, string?, IReadOnlyDictionary<int, object?>)>(statusResult.Error);
            }

            ipAddress = rediscoveredIp;
            resolvedIp = rediscoveredIp;

            statusResult = await TryWithTimeoutAsync(
                ct => protocolClient.QueryStatusAsync(ipAddress, connection.TuyaDeviceId, connection.LocalKey, ct),
                connection.TuyaDeviceId,
                ipAddress,
                cancellationToken
            );

            if (statusResult.IsFailure)
            {
                return Result.Failure<(string, string?, IReadOnlyDictionary<int, object?>)>(statusResult.Error);
            }
        }

        return Result.Success((ipAddress, resolvedIp, statusResult.Value));
    }

    // Fallback literal "22" (não o default do property initializer de
    // DeviceConfiguration.DpsBrightnessKey) — dispositivos cadastrados antes
    // deste campo existir têm a chave ausente do JSON persistido, o que
    // desserializa como null, não como o default da classe (confirmado
    // inspecionando a coluna Configuration real no Postgres). Sem heurística
    // segura de "único DP numérico" (colide com temp. de cor), então o
    // fallback é este valor fixo confirmado por diagnóstico manual, igual
    // documentado em DeviceConfiguration.cs.
    private const int DefaultBrightnessDp = 22;

    private static int? ResolveNumericDp(string? configuredDp, IReadOnlyDictionary<int, object?> status)
    {
        if (int.TryParse(configuredDp, out var configured) && status.TryGetValue(configured, out var configuredValue)
            && configuredValue is double)
        {
            return configured;
        }

        if (status.TryGetValue(DefaultBrightnessDp, out var defaultValue) && defaultValue is double)
        {
            return DefaultBrightnessDp;
        }

        return null;
    }

    private static int? ResolveColorDp(string? configuredDp, IReadOnlyDictionary<int, object?> status)
    {
        if (int.TryParse(configuredDp, out var configured) && status.TryGetValue(configured, out var configuredValue)
            && TuyaColorConverter.LooksLikeColorDpValue(configuredValue))
        {
            return configured;
        }

        var candidate = status.FirstOrDefault(kv => TuyaColorConverter.LooksLikeColorDpValue(kv.Value));
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
        var candidate = status.FirstOrDefault(kv => kv.Value is string text && WorkModeValues.Contains(text));
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
        using var linkedCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken, timeoutCts.Token);

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
            return Result.Failure<T>(new Error("Device.Offline", "Dispositivo Tuya não respondeu (timeout)."));
        }
        catch (SocketException ex)
        {
            logger.LogWarning(
                ex,
                "Falha de conexão com dispositivo Tuya {DeviceId} em {IpAddress}",
                tuyaDeviceId,
                ipAddress
            );
            return Result.Failure<T>(new Error("Device.Offline", "Não foi possível conectar ao dispositivo Tuya."));
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
            logger.LogWarning(ex, "Falha inesperada ao comunicar com dispositivo Tuya {DeviceId}", tuyaDeviceId);
            return Result.Failure<T>(new Error("Device.CommunicationError", "Falha ao comunicar com o dispositivo Tuya."));
        }
    }

    private async Task<string?> TryResolveIpAsync(string tuyaDeviceId, CancellationToken cancellationToken)
    {
        using var timeoutCts = new CancellationTokenSource(IpResolutionTimeout);
        using var linkedCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken, timeoutCts.Token);

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
