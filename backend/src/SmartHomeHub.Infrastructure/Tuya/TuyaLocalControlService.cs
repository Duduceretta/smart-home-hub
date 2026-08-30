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
