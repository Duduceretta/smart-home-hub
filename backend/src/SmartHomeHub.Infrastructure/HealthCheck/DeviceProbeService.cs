using System.Net.Sockets;
using Microsoft.Extensions.Logging;
using SmartHomeHub.Application.Common.Extensions;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Domain.Enums;

namespace SmartHomeHub.Infrastructure.HealthCheck;

public sealed class DeviceProbeService(ILogger<DeviceProbeService> logger) : IDeviceProbeService
{
    private static readonly TimeSpan ProbeTimeout = TimeSpan.FromMilliseconds(2000);

    public async Task<bool> ProbeDeviceAsync(
        string ipAddress,
        IntegrationType integrationType,
        CancellationToken cancellationToken = default
    )
    {
        var candidatePorts = integrationType.GetProbeCandidatePorts();

        foreach (var port in candidatePorts)
        {
            if (await TryConnectAsync(ipAddress, port, cancellationToken))
            {
                return true;
            }

            logger.LogDebug(
                "Probe falhou para {IpAddress}:{Port} ({IntegrationType})",
                ipAddress,
                port,
                integrationType
            );
        }

        return false;
    }

    private static async Task<bool> TryConnectAsync(
        string ipAddress,
        int port,
        CancellationToken cancellationToken
    )
    {
        using var cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        cts.CancelAfter(ProbeTimeout);

        using var client = new TcpClient();
        try
        {
            await client.ConnectAsync(ipAddress, port, cts.Token);
            return client.Connected;
        }
        catch
        {
            return false;
        }
    }
}
