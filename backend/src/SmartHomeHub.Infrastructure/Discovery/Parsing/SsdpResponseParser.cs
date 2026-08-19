using System.Net;
using System.Text.RegularExpressions;
using SmartHomeHub.Application.Features.Devices.Common;
using SmartHomeHub.Domain.Enums;

namespace SmartHomeHub.Infrastructure.Discovery.Parsing;

public static partial class SsdpResponseParser
{
    public static DiscoveredDeviceDto? TryParse(string rawResponse, IPEndPoint remoteEndPoint)
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

        var externalId = ExtractUuid(usn) ?? $"ssdp:{remoteEndPoint.Address}";
        var brand = ExtractBrand(server);

        var additionalProperties = new Dictionary<string, string>();
        if (!string.IsNullOrEmpty(searchTarget))
        {
            additionalProperties["ssdp_st"] = searchTarget;
        }
        if (!string.IsNullOrEmpty(location))
        {
            additionalProperties["ssdp_location"] = location;
        }

        return new DiscoveredDeviceDto(
            TemporaryId: Guid.NewGuid().ToString(),
            Name: brand is not null ? $"Dispositivo UPnP ({brand})" : "Dispositivo UPnP",
            Brand: brand ?? "Desconhecido",
            ExternalId: externalId,
            Type: DeviceType.Sensor,
            IntegrationType: IntegrationType.SsdpUpnp,
            IpAddress: remoteEndPoint.Address.ToString(),
            MacAddress: null,
            SignalStrength: null,
            AdditionalProperties: additionalProperties.Count > 0 ? additionalProperties : null
        );
    }

    private static string? ExtractUuid(string? usn)
    {
        if (string.IsNullOrEmpty(usn))
        {
            return null;
        }

        var match = UuidRegex().Match(usn);
        return match.Success ? match.Groups[1].Value : null;
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

    [GeneratedRegex("uuid:([a-fA-F0-9-]+)")]
    private static partial Regex UuidRegex();
}
