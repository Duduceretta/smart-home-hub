using System.Net.Sockets;
using System.Security.Cryptography;
using Microsoft.Extensions.Logging;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Domain.Common.Primitives;

namespace SmartHomeHub.Infrastructure.Tuya;

/// <summary>
/// Dois helpers de comunicação de rede compartilhados entre a superfície de
/// comando pública de TuyaLocalControlService e o TuyaLightCommandCoalescer:
/// resolução de IP+status (com retry de redescoberta) e o executor genérico
/// com timeout/tradução de exceção de rede pra Result. Extraído de
/// TuyaLocalControlService (ver backend-audit-2026-09-05.md, seção 05, e
/// iot-drivers.md) — extração mecânica, mesma lógica. Antes passados por
/// delegate no construtor do coalescedor pra evitar duplicação; agora
/// injetados diretamente como uma única instância compartilhada.
/// </summary>
internal sealed class TuyaNetworkOperationExecutor(TuyaIpResolver ipResolver, ILogger logger)
{
    // Chamada síncrona dentro do handler HTTP — sem limite próprio, uma lâmpada
    // presente na rede mas que não responde prenderia a requisição pelo timeout
    // de TCP do SO (bem mais longo que aceitável). Cada etapa de rede usa este budget.
    private static readonly TimeSpan OperationTimeout = TimeSpan.FromSeconds(3);

    public async Task<
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
            ipAddress = await ipResolver.TryResolveIpAsync(
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

            var rediscoveredIp = await ipResolver.TryResolveIpAsync(
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

    public async Task<Result<T>> TryWithTimeoutAsync<T>(
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
