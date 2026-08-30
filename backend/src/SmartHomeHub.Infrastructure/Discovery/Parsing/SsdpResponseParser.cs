using System.Net;
using SmartHomeHub.Application.Features.Devices.Common;
using SmartHomeHub.Domain.Enums;

namespace SmartHomeHub.Infrastructure.Discovery.Parsing;

// Um único anúncio SSDP bruto (uma resposta M-SEARCH ou um NOTIFY), antes de
// agrupar por dispositivo físico. Um aparelho real tipicamente manda vários
// desses (um por root device/serviço UPnP que expõe).
public record SsdpAnnouncement(
    IPAddress RemoteAddress,
    string? Usn,
    string? SearchTarget,
    string? Location,
    string? Server,
    string? DlnaDeviceName
);

public static class SsdpResponseParser
{
    // Serviços que o hub sabe controlar hoje. Um dispositivo agrupado só é
    // exibido ao usuário se anunciar pelo menos um desses — evita listar
    // aparelhos "encontrados mas sem nada que o hub sabe fazer com eles"
    // (ex: impressoras, NAS, etc. respondendo a ssdp:all).
    private static readonly string[] ControllableServicePrefixes =
    [
        "urn:dial-multiscreen-org:service:dial:",
        "urn:schemas-upnp-org:service:avtransport:",
    ];

    // O roteador doméstico (Internet Gateway Device) sempre responde a
    // ssdp:all — não é um dispositivo que o hub deveria oferecer pra
    // "adicionar". Filtrado explicitamente, não só pela ausência de serviço
    // controlável (defesa em profundidade, caso algum IGD também anuncie algo
    // que colida por acidente com o allowlist acima).
    private static readonly string[] GatewayServicePrefixes =
    [
        "urn:schemas-upnp-org:device:internetgatewaydevice:",
        "urn:schemas-upnp-org:service:wanipconnection:",
        "urn:schemas-upnp-org:service:wanpppconnection:",
    ];

    public static SsdpAnnouncement? TryParseAnnouncement(string rawResponse, IPEndPoint remoteEndPoint)
    {
        if (string.IsNullOrWhiteSpace(rawResponse))
        {
            return null;
        }

        var lines = rawResponse.Split(
            "\r\n",
            StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries
        );

        if (lines.Length == 0 || !lines[0].StartsWith("HTTP/1.1 200", StringComparison.OrdinalIgnoreCase))
        {
            return null;
        }

        var headers = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

        foreach (var line in lines.Skip(1))
        {
            var separatorIndex = line.IndexOf(':');
            if (separatorIndex <= 0)
            {
                continue;
            }

            var key = line[..separatorIndex].Trim();
            var value = line[(separatorIndex + 1)..].Trim();
            headers[key] = value;
        }

        headers.TryGetValue("USN", out var usn);
        headers.TryGetValue("ST", out var searchTarget);
        headers.TryGetValue("LOCATION", out var location);
        headers.TryGetValue("SERVER", out var server);
        headers.TryGetValue("DLNADeviceName.lge.com", out var dlnaDeviceName);

        return new SsdpAnnouncement(
            remoteEndPoint.Address,
            usn,
            searchTarget,
            location,
            server,
            Uri.UnescapeDataString(dlnaDeviceName ?? string.Empty) is { Length: > 0 } decoded ? decoded : null
        );
    }

    public static bool IsControllable(IReadOnlyList<SsdpAnnouncement> group) =>
        group.Any(a => MatchesAnyPrefix(a.SearchTarget, ControllableServicePrefixes)
            || MatchesAnyPrefix(a.Usn, ControllableServicePrefixes));

    public static bool IsGateway(IReadOnlyList<SsdpAnnouncement> group) =>
        group.Any(a => MatchesAnyPrefix(a.SearchTarget, GatewayServicePrefixes)
            || MatchesAnyPrefix(a.Usn, GatewayServicePrefixes));

    private static bool MatchesAnyPrefix(string? value, string[] prefixes) =>
        value is not null
        && prefixes.Any(prefix => value.StartsWith(prefix, StringComparison.OrdinalIgnoreCase));

    // Ordem de prioridade pro nome de exibição do dispositivo agrupado:
    // friendlyName do XML de descrição (mais confiável, mas exige um fetch HTTP
    // à parte — ver SsdpDeviceDescriptionFetcher) > DLNADeviceName (já vem no
    // header da resposta, sem round-trip extra) > Server parseado > genérico.
    public static string ResolveDisplayName(IReadOnlyList<SsdpAnnouncement> group, string? friendlyNameFromXml)
    {
        if (!string.IsNullOrWhiteSpace(friendlyNameFromXml))
        {
            return friendlyNameFromXml;
        }

        var dlnaName = group.Select(a => a.DlnaDeviceName).FirstOrDefault(n => !string.IsNullOrWhiteSpace(n));
        if (dlnaName is not null)
        {
            return dlnaName;
        }

        var brand = group.Select(a => ExtractBrand(a.Server)).FirstOrDefault(b => b is not null);
        return brand is not null ? $"Dispositivo UPnP ({brand})" : "Dispositivo UPnP";
    }

    public static string ResolveBrand(IReadOnlyList<SsdpAnnouncement> group) =>
        group.Select(a => ExtractBrand(a.Server)).FirstOrDefault(b => b is not null) ?? "Desconhecido";

    public static DiscoveredDeviceDto BuildDeviceDto(
        IReadOnlyList<SsdpAnnouncement> group,
        string displayName,
        string brand
    )
    {
        var first = group[0];
        var externalId = $"ssdp:{first.RemoteAddress}";

        var services = group
            .Select(a => new UpnpServiceInfo(a.Usn, a.SearchTarget, a.Location))
            .ToList();

        var additionalProperties = new Dictionary<string, string>();
        var location = group.Select(a => a.Location).FirstOrDefault(l => l is not null);
        if (location is not null)
        {
            additionalProperties["ssdp_location"] = location;
        }

        return new DiscoveredDeviceDto(
            TemporaryId: Guid.NewGuid().ToString(),
            Name: displayName,
            Brand: brand,
            ExternalId: externalId,
            Type: DeviceType.Sensor,
            IntegrationType: IntegrationType.SsdpUpnp,
            IpAddress: first.RemoteAddress.ToString(),
            MacAddress: null,
            SignalStrength: null,
            AdditionalProperties: additionalProperties.Count > 0 ? additionalProperties : null,
            UpnpServices: services
        );
    }

    private static string? ExtractBrand(string? server)
    {
        if (string.IsNullOrWhiteSpace(server))
        {
            return null;
        }

        var tokens = server.Split(' ', StringSplitOptions.RemoveEmptyEntries);
        return tokens.Length >= 2 ? tokens[^2].Split('/')[0] : null;
    }
}
