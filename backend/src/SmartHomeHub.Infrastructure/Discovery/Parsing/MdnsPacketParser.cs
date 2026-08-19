using System.Net;
using System.Text;
using SmartHomeHub.Application.Features.Devices.Common;
using SmartHomeHub.Domain.Enums;

namespace SmartHomeHub.Infrastructure.Discovery.Parsing;

public static class MdnsPacketParser
{
    private const int HeaderLength = 12;

    public static DiscoveredDeviceDto? TryParse(byte[] buffer, IPEndPoint remoteEndPoint)
    {
        try
        {
            return TryParseCore(buffer, remoteEndPoint);
        }
        catch (Exception)
        {
            // Pacote corrompido/hostil: falha de parsing vira "sem device", nunca derruba o scanner.
            return null;
        }
    }

    private static DiscoveredDeviceDto? TryParseCore(byte[] buffer, IPEndPoint remoteEndPoint)
    {
        if (buffer.Length < HeaderLength)
        {
            return null;
        }

        var flags = (buffer[2] << 8) | buffer[3];
        var isResponse = (flags & 0x8000) != 0;
        var answerCount = (buffer[6] << 8) | buffer[7];

        if (!isResponse || answerCount == 0)
        {
            return null;
        }

        var questionCount = (buffer[4] << 8) | buffer[5];
        var offset = HeaderLength;

        for (var i = 0; i < questionCount; i++)
        {
            ReadName(buffer, ref offset);
            offset += 4; // QTYPE + QCLASS
        }

        string? ptrName = null;
        string? srvTarget = null;
        var txtRecords = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        string? aRecordIp = null;

        for (var i = 0; i < answerCount && offset < buffer.Length; i++)
        {
            var name = ReadName(buffer, ref offset);

            if (offset + 10 > buffer.Length)
            {
                break;
            }

            var type = (buffer[offset] << 8) | buffer[offset + 1];
            offset += 2; // TYPE
            offset += 2; // CLASS
            offset += 4; // TTL
            var dataLength = (buffer[offset] << 8) | buffer[offset + 1];
            offset += 2; // RDLENGTH

            if (offset + dataLength > buffer.Length)
            {
                break;
            }

            switch (type)
            {
                case 12: // PTR
                    var ptrOffset = offset;
                    ptrName = ReadName(buffer, ref ptrOffset);
                    break;
                case 33: // SRV
                    var srvOffset = offset + 6; // priority + weight + port
                    srvTarget = ReadName(buffer, ref srvOffset);
                    break;
                case 16: // TXT
                    ParseTxtRecord(buffer, offset, dataLength, txtRecords);
                    break;
                case 1: // A
                    if (dataLength == 4)
                    {
                        aRecordIp = new IPAddress(buffer.AsSpan(offset, 4)).ToString();
                    }
                    break;
            }

            offset += dataLength;
            _ = name;
        }

        if (ptrName is null && srvTarget is null && txtRecords.Count == 0)
        {
            return null;
        }

        var integrationType = ResolveIntegrationType(ptrName);
        var ipAddress = aRecordIp ?? remoteEndPoint.Address.ToString();

        txtRecords.TryGetValue("id", out var txtId);
        txtRecords.TryGetValue("fn", out var friendlyName);
        txtRecords.TryGetValue("md", out var model);

        var externalId = txtId ?? $"mdns:{srvTarget ?? ptrName ?? ipAddress}";
        var name2 = friendlyName ?? srvTarget ?? ptrName ?? "Dispositivo mDNS";

        var additionalProperties = new Dictionary<string, string>();
        if (ptrName is not null)
        {
            additionalProperties["mdns_service"] = ptrName;
        }
        if (srvTarget is not null)
        {
            additionalProperties["mdns_host"] = srvTarget;
        }

        return new DiscoveredDeviceDto(
            TemporaryId: Guid.NewGuid().ToString(),
            Name: name2,
            Brand: model ?? IntegrationBrand(integrationType),
            ExternalId: externalId,
            Type: DeviceType.Sensor,
            IntegrationType: integrationType,
            IpAddress: ipAddress,
            MacAddress: null,
            SignalStrength: null,
            AdditionalProperties: additionalProperties.Count > 0 ? additionalProperties : null
        );
    }

    private static void ParseTxtRecord(
        byte[] buffer,
        int offset,
        int dataLength,
        Dictionary<string, string> target
    )
    {
        var end = offset + dataLength;
        var cursor = offset;

        while (cursor < end)
        {
            var entryLength = buffer[cursor];
            cursor += 1;

            if (entryLength == 0 || cursor + entryLength > end)
            {
                break;
            }

            var entry = Encoding.UTF8.GetString(buffer, cursor, entryLength);
            cursor += entryLength;

            var separatorIndex = entry.IndexOf('=');
            if (separatorIndex > 0)
            {
                target[entry[..separatorIndex]] = entry[(separatorIndex + 1)..];
            }
        }
    }

    private static string ReadName(byte[] buffer, ref int offset)
    {
        var labels = new List<string>();
        var jumped = false;
        var originalOffset = offset;
        var safety = 0;

        while (offset < buffer.Length && safety++ < 128)
        {
            var length = buffer[offset];

            if (length == 0)
            {
                offset += 1;
                break;
            }

            if ((length & 0xC0) == 0xC0)
            {
                if (offset + 1 >= buffer.Length)
                {
                    break;
                }

                var pointer = ((length & 0x3F) << 8) | buffer[offset + 1];

                if (!jumped)
                {
                    originalOffset = offset + 2;
                    jumped = true;
                }

                offset = pointer;
                continue;
            }

            offset += 1;

            if (offset + length > buffer.Length)
            {
                break;
            }

            labels.Add(Encoding.UTF8.GetString(buffer, offset, length));
            offset += length;
        }

        if (jumped)
        {
            offset = originalOffset;
        }

        return string.Join('.', labels);
    }

    private static IntegrationType ResolveIntegrationType(string? ptrName)
    {
        if (ptrName is null)
        {
            return IntegrationType.MdnsZeroconf;
        }

        if (ptrName.Contains("_googlecast._tcp", StringComparison.OrdinalIgnoreCase))
        {
            return IntegrationType.GoogleCast;
        }

        if (ptrName.Contains("_esphomelib._tcp", StringComparison.OrdinalIgnoreCase))
        {
            return IntegrationType.EspHomeMqtt;
        }

        return IntegrationType.MdnsZeroconf;
    }

    private static string IntegrationBrand(IntegrationType integrationType) =>
        integrationType switch
        {
            IntegrationType.GoogleCast => "Google",
            IntegrationType.EspHomeMqtt => "ESPHome",
            _ => "Desconhecido",
        };
}
