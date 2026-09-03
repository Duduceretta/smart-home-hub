using System.Collections.Concurrent;
using System.Net;
using System.Net.Sockets;
using System.Runtime.CompilerServices;
using System.Text;
using System.Threading.Channels;
using Microsoft.Extensions.Logging;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Application.Features.Devices.Common;
using SmartHomeHub.Domain.Enums;
using SmartHomeHub.Infrastructure.Discovery.Parsing;

namespace SmartHomeHub.Infrastructure.Discovery.Scanners;

public sealed class SsdpDiscoveryScanner(ILogger<SsdpDiscoveryScanner> logger)
    : IDeviceDiscoveryScanner
{
    private static readonly IPEndPoint MulticastEndPoint = new(
        IPAddress.Parse("239.255.255.250"),
        1900
    );

    // Um aparelho físico manda vários anúncios (um por root device/serviço UPnP)
    // em rajada — na captura real todos chegaram em menos de 1s. Espera essa
    // janela de silêncio por IP antes de consolidar e emitir o dispositivo
    // agrupado, evitando um card por USN (ver SsdpResponseParser.BuildDeviceDto).
    private static readonly TimeSpan GroupDebounceWindow = TimeSpan.FromSeconds(2);
    private static readonly TimeSpan SweepInterval = TimeSpan.FromMilliseconds(500);

    private const string MSearchRequest =
        "M-SEARCH * HTTP/1.1\r\n"
        + "HOST: 239.255.255.250:1900\r\n"
        + "MAN: \"ssdp:discover\"\r\n"
        + "MX: 3\r\n"
        + "ST: ssdp:all\r\n\r\n";

    public IntegrationType IntegrationType => IntegrationType.SsdpUpnp;

    private sealed class PendingGroup
    {
        public readonly List<SsdpAnnouncement> Announcements = [];
        public DateTime LastSeenUtc = DateTime.UtcNow;
    }

    public async IAsyncEnumerable<DiscoveredDeviceDto> ScanAsync(
        [EnumeratorCancellation] CancellationToken cancellationToken
    )
    {
        // Um socket por interface, vinculado ao IP dela — não um socket "wildcard"
        // (0.0.0.0) compartilhado. Ver LocalNetworkInterfaces para o porquê.
        var localAddresses = LocalNetworkInterfaces.GetQualifiedIPv4Addresses();

        if (localAddresses.Count == 0)
        {
            logger.LogWarning("Nenhuma interface de rede qualificada encontrada para o scan SSDP.");
            yield break;
        }

        var channel = Channel.CreateUnbounded<DiscoveredDeviceDto>();
        var descriptionFetcher = new SsdpDeviceDescriptionFetcher(logger);

        // Estado compartilhado entre TODAS as interfaces — o mesmo IP físico pode
        // responder via mais de uma interface local, e precisa cair no mesmo grupo.
        var pendingByIp = new ConcurrentDictionary<IPAddress, PendingGroup>();

        var receiveTasks = localAddresses
            .Select(address => ReceiveOnInterfaceAsync(address, pendingByIp, cancellationToken))
            .ToArray();

        var sweepTask = SweepAndEmitAsync(
            pendingByIp,
            channel.Writer,
            descriptionFetcher,
            cancellationToken
        );

        _ = Task.WhenAll([.. receiveTasks, sweepTask])
            .ContinueWith(_ => channel.Writer.TryComplete(), TaskScheduler.Default);

        await foreach (var discovered in channel.Reader.ReadAllAsync(cancellationToken))
        {
            yield return discovered;
        }
    }

    private async Task ReceiveOnInterfaceAsync(
        IPAddress localAddress,
        ConcurrentDictionary<IPAddress, PendingGroup> pendingByIp,
        CancellationToken cancellationToken
    )
    {
        using var udpClient = new UdpClient(new IPEndPoint(localAddress, 0));
        udpClient.Client.SetSocketOption(
            SocketOptionLevel.Socket,
            SocketOptionName.ReuseAddress,
            true
        );

        var requestBytes = Encoding.UTF8.GetBytes(MSearchRequest);

        try
        {
            await udpClient.SendAsync(requestBytes, requestBytes.Length, MulticastEndPoint);
        }
        catch (SocketException ex)
        {
            logger.LogWarning(
                ex,
                "Falha ao enviar M-SEARCH SSDP via {LocalAddress}.",
                localAddress
            );
            return;
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
                logger.LogWarning(
                    ex,
                    "Falha ao receber resposta SSDP via {LocalAddress}.",
                    localAddress
                );
                continue;
            }

            // DIAGNÓSTICO TEMPORÁRIO: conta datagramas recebidos no socket, antes de
            // qualquer parsing/processamento — pra comparar contra captura Wireshark
            // (udp.port == 1900) e isolar se perda acontece no buffer do socket/SO
            // ou depois, no processamento/dedup/notificação. Remover após diagnóstico.
            logger.LogDebug(
                "SSDP RECV [{Timestamp:HH:mm:ss.fff}] via {LocalAddress}: {Length} bytes de {RemoteEndPoint}",
                DateTime.Now,
                localAddress,
                result.Buffer.Length,
                result.RemoteEndPoint
            );

            var rawResponse = Encoding.UTF8.GetString(result.Buffer);
            var announcement = SsdpResponseParser.TryParseAnnouncement(
                rawResponse,
                result.RemoteEndPoint
            );

            if (announcement is null)
            {
                continue;
            }

            var group = pendingByIp.GetOrAdd(announcement.RemoteAddress, _ => new PendingGroup());
            lock (group)
            {
                group.Announcements.Add(announcement);
                group.LastSeenUtc = DateTime.UtcNow;
            }
        }
    }

    // Roda em paralelo aos receptores, varrendo periodicamente os grupos pendentes
    // e emitindo (fetch de nome + filtro + DTO) qualquer um que ficou quieto por
    // GroupDebounceWindow. Ao final (cancelamento/timeout da sessão), faz uma
    // varredura final pra não perder grupos cuja janela de debounce ainda não
    // tinha expirado quando a sessão encerrou.
    private async Task SweepAndEmitAsync(
        ConcurrentDictionary<IPAddress, PendingGroup> pendingByIp,
        ChannelWriter<DiscoveredDeviceDto> writer,
        SsdpDeviceDescriptionFetcher descriptionFetcher,
        CancellationToken cancellationToken
    )
    {
        try
        {
            while (!cancellationToken.IsCancellationRequested)
            {
                await Task.Delay(SweepInterval, cancellationToken);
                await EmitIdleGroupsAsync(
                    pendingByIp,
                    writer,
                    descriptionFetcher,
                    idleOnly: true,
                    cancellationToken
                );
            }
        }
        catch (OperationCanceledException)
        {
            // Esperado no fim da sessão — cai na varredura final abaixo mesmo assim.
        }

        await EmitIdleGroupsAsync(
            pendingByIp,
            writer,
            descriptionFetcher,
            idleOnly: false,
            CancellationToken.None
        );
    }

    private async Task EmitIdleGroupsAsync(
        ConcurrentDictionary<IPAddress, PendingGroup> pendingByIp,
        ChannelWriter<DiscoveredDeviceDto> writer,
        SsdpDeviceDescriptionFetcher descriptionFetcher,
        bool idleOnly,
        CancellationToken cancellationToken
    )
    {
        var now = DateTime.UtcNow;

        foreach (var ip in pendingByIp.Keys.ToArray())
        {
            if (!pendingByIp.TryGetValue(ip, out var group))
            {
                continue;
            }

            List<SsdpAnnouncement> snapshot;
            lock (group)
            {
                if (idleOnly && now - group.LastSeenUtc < GroupDebounceWindow)
                {
                    continue;
                }

                snapshot = [.. group.Announcements];
            }

            if (!pendingByIp.TryRemove(ip, out _) || snapshot.Count == 0)
            {
                continue;
            }

            if (
                SsdpResponseParser.IsGateway(snapshot)
                || !SsdpResponseParser.IsControllable(snapshot)
            )
            {
                logger.LogDebug(
                    "Dispositivo SSDP de {Ip} descartado (gateway ou sem serviço controlável conhecido).",
                    ip
                );
                continue;
            }

            var location = snapshot.Select(a => a.Location).FirstOrDefault(l => l is not null);
            var friendlyName = await descriptionFetcher.TryFetchFriendlyNameAsync(
                location,
                cancellationToken
            );

            var displayName = SsdpResponseParser.ResolveDisplayName(snapshot, friendlyName);
            var brand = SsdpResponseParser.ResolveBrand(snapshot);
            var dto = SsdpResponseParser.BuildDeviceDto(snapshot, displayName, brand);

            await writer.WriteAsync(dto, cancellationToken);
        }
    }
}
