using System.Net;
using System.Net.Sockets;
using System.Runtime.CompilerServices;
using Microsoft.Extensions.Logging;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Application.Features.Devices.Common;
using SmartHomeHub.Domain.Enums;
using SmartHomeHub.Infrastructure.Discovery.Parsing;

namespace SmartHomeHub.Infrastructure.Discovery.Scanners;

public sealed class MdnsDiscoveryScanner(ILogger<MdnsDiscoveryScanner> logger) : IDeviceDiscoveryScanner
{
    private static readonly IPAddress MulticastAddress = IPAddress.Parse("224.0.0.251");
    private const int MdnsPort = 5353;

    private static readonly string[] ServiceTypes =
    [
        "_googlecast._tcp.local",
        "_hap._tcp.local",
        "_esphomelib._tcp.local",
        "_http._tcp.local",
    ];

    public IntegrationType IntegrationType => IntegrationType.MdnsZeroconf;

    public async IAsyncEnumerable<DiscoveredDeviceDto> ScanAsync(
        [EnumeratorCancellation] CancellationToken cancellationToken
    )
    {
        using var udpClient = new UdpClient();
        udpClient.Client.SetSocketOption(SocketOptionLevel.Socket, SocketOptionName.ReuseAddress, true);
        udpClient.Client.Bind(new IPEndPoint(IPAddress.Any, MdnsPort));
        udpClient.JoinMulticastGroup(MulticastAddress);

        var multicastEndPoint = new IPEndPoint(MulticastAddress, MdnsPort);

        foreach (var serviceType in ServiceTypes)
        {
            try
            {
                var query = MdnsQueryBuilder.BuildPtrQuery(serviceType);
                await udpClient.SendAsync(query, query.Length, multicastEndPoint);
            }
            catch (SocketException ex)
            {
                logger.LogWarning(ex, "Falha ao enviar query mDNS para {ServiceType}", serviceType);
            }
        }

        while (!cancellationToken.IsCancellationRequested)
        {
            UdpReceiveResult result;

            try
            {
                result = await udpClient.ReceiveAsync(cancellationToken);
            }
            catch (OperationCanceledException)
            {
                yield break;
            }
            catch (SocketException ex)
            {
                logger.LogWarning(ex, "Falha ao receber pacote mDNS.");
                continue;
            }

            var parsed = MdnsPacketParser.TryParse(result.Buffer, result.RemoteEndPoint);

            if (parsed is not null)
            {
                yield return parsed;
            }
        }
    }
}
