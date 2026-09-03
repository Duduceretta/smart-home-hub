using System.Net;
using System.Net.Sockets;
using System.Runtime.CompilerServices;
using System.Threading.Channels;
using Microsoft.Extensions.Logging;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Application.Features.Devices.Common;
using SmartHomeHub.Domain.Enums;
using SmartHomeHub.Infrastructure.Discovery.Parsing;

namespace SmartHomeHub.Infrastructure.Discovery.Scanners;

public sealed class TuyaUdpDiscoveryScanner(ILogger<TuyaUdpDiscoveryScanner> logger)
    : IDeviceDiscoveryScanner,
        ITuyaUdpDiscoveryScanner
{
    private static readonly int[] ListenPorts = [6666, 6667];

    public IntegrationType IntegrationType => IntegrationType.TuyaLocal;

    public async IAsyncEnumerable<DiscoveredDeviceDto> ScanAsync(
        [EnumeratorCancellation] CancellationToken cancellationToken
    )
    {
        var channel = Channel.CreateUnbounded<DiscoveredDeviceDto>();

        var listenTasks = ListenPorts
            .Select(port => ListenOnPortAsync(port, channel.Writer, cancellationToken))
            .ToArray();

        _ = Task.WhenAll(listenTasks)
            .ContinueWith(_ => channel.Writer.TryComplete(), TaskScheduler.Default);

        await foreach (var discovered in channel.Reader.ReadAllAsync(cancellationToken))
        {
            yield return discovered;
        }
    }

    private async Task ListenOnPortAsync(
        int port,
        ChannelWriter<DiscoveredDeviceDto> writer,
        CancellationToken cancellationToken
    )
    {
        using var udpClient = new UdpClient();
        udpClient.Client.SetSocketOption(
            SocketOptionLevel.Socket,
            SocketOptionName.ReuseAddress,
            true
        );
        udpClient.Client.Bind(new IPEndPoint(IPAddress.Any, port));

        while (!cancellationToken.IsCancellationRequested)
        {
            UdpReceiveResult result;

            try
            {
                result = await udpClient.ReceiveAsync(cancellationToken);
            }
            catch (OperationCanceledException)
            {
                return;
            }
            catch (SocketException ex)
            {
                logger.LogWarning(ex, "Falha ao receber broadcast Tuya na porta {Port}", port);
                continue;
            }

            var parsed = TuyaUdpPacketDecoder.TryParse(
                result.Buffer,
                port,
                result.RemoteEndPoint.Address.ToString(),
                logger
            );

            if (parsed is not null)
            {
                await writer.WriteAsync(parsed, cancellationToken);
            }
            else
            {
                // DIAGNÓSTICO TEMPORÁRIO: torna visível quando um pacote chegou na porta Tuya
                // mas foi descartado (estrutura inválida ou decode falhou — ver log do decoder acima).
                logger.LogDebug(
                    "Pacote recebido em {SourceIp}:{Port} descartado pelo decoder Tuya ({Length} bytes)",
                    result.RemoteEndPoint.Address,
                    port,
                    result.Buffer.Length
                );
            }
        }
    }
}
