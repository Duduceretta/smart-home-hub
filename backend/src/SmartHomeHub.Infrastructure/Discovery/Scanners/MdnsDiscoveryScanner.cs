using System.Collections.Concurrent;
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
        // Um socket por interface, vinculado ao IP dela — não um socket "wildcard"
        // (0.0.0.0) compartilhado. Confirmado por teste real em 2026-08-30: com bind
        // wildcard, o Chromecast (192.168.2.182, responde normalmente a
        // _googlecast._tcp.local) nunca apareceu em duas tentativas seguidas — numa
        // delas o único resultado veio da própria interface Radmin VPN (ruído local,
        // não um dispositivo da LAN). Mesma causa raiz já corrigida no SsdpDiscoveryScanner
        // (ver LocalNetworkInterfaces).
        var localAddresses = LocalNetworkInterfaces.GetQualifiedIPv4Addresses();

        if (localAddresses.Count == 0)
        {
            logger.LogWarning("Nenhuma interface de rede qualificada encontrada para o scan mDNS.");
            yield break;
        }

        var channel = Channel.CreateUnbounded<DiscoveredDeviceDto>();
        var seenExternalIds = new ConcurrentDictionary<string, byte>();

        var scanTasks = localAddresses
            .Select(address => ScanOnInterfaceAsync(address, channel.Writer, seenExternalIds, cancellationToken))
            .ToArray();

        _ = Task.WhenAll(scanTasks).ContinueWith(_ => channel.Writer.TryComplete(), TaskScheduler.Default);

        await foreach (var discovered in channel.Reader.ReadAllAsync(cancellationToken))
        {
            yield return discovered;
        }
    }

    private async Task ScanOnInterfaceAsync(
        IPAddress localAddress,
        ChannelWriter<DiscoveredDeviceDto> writer,
        ConcurrentDictionary<string, byte> seenExternalIds,
        CancellationToken cancellationToken
    )
    {
        // mDNS respostas costumam voltar via multicast pra porta 5353 (não unicast
        // pra porta efêmera de quem perguntou, diferente do SSDP) — o bind precisa
        // ser nessa porta fixa, só o endereço local é que muda por interface. Ordem
        // importa: ReuseAddress precisa estar setado ANTES do bind (o construtor
        // UdpClient(IPEndPoint) já faz bind internamente sem essa opção, o que faria
        // o segundo socket de outra interface falhar silenciosamente na mesma porta).
        using var udpClient = new UdpClient();

        try
        {
            udpClient.Client.SetSocketOption(SocketOptionLevel.Socket, SocketOptionName.ReuseAddress, true);
            udpClient.Client.Bind(new IPEndPoint(localAddress, MdnsPort));
            udpClient.JoinMulticastGroup(MulticastAddress, localAddress);
        }
        catch (SocketException ex)
        {
            logger.LogWarning(ex, "Falha ao preparar socket mDNS via {LocalAddress}.", localAddress);
            return;
        }

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
                logger.LogWarning(ex, "Falha ao enviar query mDNS para {ServiceType} via {LocalAddress}", serviceType, localAddress);
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
                return;
            }
            catch (SocketException ex)
            {
                logger.LogWarning(ex, "Falha ao receber pacote mDNS via {LocalAddress}.", localAddress);
                continue;
            }

            var parsed = MdnsPacketParser.TryParse(result.Buffer, result.RemoteEndPoint);

            if (parsed is null)
            {
                continue;
            }

            if (!seenExternalIds.TryAdd(parsed.ExternalId, 0))
            {
                continue;
            }

            await writer.WriteAsync(parsed, cancellationToken);
        }
    }
}
