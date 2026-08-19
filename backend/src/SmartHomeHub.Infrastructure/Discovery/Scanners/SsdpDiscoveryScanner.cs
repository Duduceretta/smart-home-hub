using System.Net;
using System.Net.Sockets;
using System.Runtime.CompilerServices;
using System.Text;
using Microsoft.Extensions.Logging;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Application.Features.Devices.Common;
using SmartHomeHub.Domain.Enums;
using SmartHomeHub.Infrastructure.Discovery.Parsing;

namespace SmartHomeHub.Infrastructure.Discovery.Scanners;

public sealed class SsdpDiscoveryScanner(ILogger<SsdpDiscoveryScanner> logger) : IDeviceDiscoveryScanner
{
    private static readonly IPEndPoint MulticastEndPoint = new(IPAddress.Parse("239.255.255.250"), 1900);

    private const string MSearchRequest =
        "M-SEARCH * HTTP/1.1\r\n"
        + "HOST: 239.255.255.250:1900\r\n"
        + "MAN: \"ssdp:discover\"\r\n"
        + "MX: 3\r\n"
        + "ST: ssdp:all\r\n\r\n";

    public IntegrationType IntegrationType => IntegrationType.SsdpUpnp;

    public async IAsyncEnumerable<DiscoveredDeviceDto> ScanAsync(
        [EnumeratorCancellation] CancellationToken cancellationToken
    )
    {
        using var udpClient = new UdpClient(0);
        udpClient.Client.SetSocketOption(SocketOptionLevel.Socket, SocketOptionName.ReuseAddress, true);

        var requestBytes = Encoding.UTF8.GetBytes(MSearchRequest);

        try
        {
            await udpClient.SendAsync(requestBytes, requestBytes.Length, MulticastEndPoint);
        }
        catch (SocketException ex)
        {
            logger.LogWarning(ex, "Falha ao enviar M-SEARCH SSDP.");
            yield break;
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
                logger.LogWarning(ex, "Falha ao receber resposta SSDP.");
                continue;
            }

            var rawResponse = Encoding.UTF8.GetString(result.Buffer);
            var parsed = SsdpResponseParser.TryParse(rawResponse, result.RemoteEndPoint);

            if (parsed is not null)
            {
                yield return parsed;
            }
        }
    }
}
