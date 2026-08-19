using System.Security.Cryptography;
using System.Text.Json;
using SmartHomeHub.Application.Features.Devices.Common;
using SmartHomeHub.Domain.Enums;

namespace SmartHomeHub.Infrastructure.Discovery.Parsing;

public static class TuyaUdpPacketDecoder
{
    private static readonly byte[] Prefix = [0x00, 0x00, 0x55, 0xAA];
    private static readonly byte[] Suffix = [0x00, 0x00, 0xAA, 0x55];

    // Chave de broadcast fixa e pública do protocolo UDP Tuya (não é segredo do usuário,
    // é a mesma chave usada por qualquer implementação open-source do protocolo v3.3).
    private static readonly byte[] BroadcastKey = "yGAdlopoPVldABfn"u8.ToArray();

    public static DiscoveredDeviceDto? TryParse(byte[] datagram, int sourcePort, string sourceIp)
    {
        try
        {
            return TryParseCore(datagram, sourcePort, sourceIp);
        }
        catch (Exception)
        {
            return null;
        }
    }

    private static DiscoveredDeviceDto? TryParseCore(byte[] datagram, int sourcePort, string sourceIp)
    {
        if (datagram.Length < Prefix.Length + Suffix.Length + 8)
        {
            return null;
        }

        if (!datagram.AsSpan(0, 4).SequenceEqual(Prefix))
        {
            return null;
        }

        if (!datagram.AsSpan(^4).SequenceEqual(Suffix))
        {
            return null;
        }

        var payloadLength = (datagram[12] << 24) | (datagram[13] << 16) | (datagram[14] << 8) | datagram[15];
        const int payloadOffset = 16;
        var payloadEnd = payloadOffset + payloadLength - 8; // desconta CRC(4) + suffix(4) já contados em length

        if (payloadEnd <= payloadOffset || payloadEnd > datagram.Length - Suffix.Length)
        {
            return null;
        }

        var payloadBytes = datagram[payloadOffset..payloadEnd];

        var json = sourcePort == 6667 ? DecryptAesEcb(payloadBytes) : System.Text.Encoding.UTF8.GetString(payloadBytes);

        if (string.IsNullOrWhiteSpace(json))
        {
            return null;
        }

        using var document = JsonDocument.Parse(json);
        var root = document.RootElement;

        var gwId = root.TryGetProperty("gwId", out var gwIdElement) ? gwIdElement.GetString() : null;
        if (string.IsNullOrEmpty(gwId))
        {
            return null;
        }

        var ip = root.TryGetProperty("ip", out var ipElement) ? ipElement.GetString() : sourceIp;
        var productKey = root.TryGetProperty("productKey", out var pkElement) ? pkElement.GetString() : null;
        var version = root.TryGetProperty("version", out var versionElement)
            ? versionElement.GetRawText().Trim('"')
            : null;

        var additionalProperties = new Dictionary<string, string>();
        if (productKey is not null)
        {
            additionalProperties["tuya_product_key"] = productKey;
        }
        if (version is not null)
        {
            additionalProperties["tuya_protocol_version"] = version;
        }

        return new DiscoveredDeviceDto(
            TemporaryId: Guid.NewGuid().ToString(),
            Name: $"Dispositivo Tuya {gwId[..Math.Min(8, gwId.Length)]}",
            Brand: "Tuya",
            ExternalId: gwId,
            Type: DeviceType.Switch,
            IntegrationType: IntegrationType.TuyaLocal,
            IpAddress: ip ?? sourceIp,
            MacAddress: null,
            SignalStrength: null,
            AdditionalProperties: additionalProperties.Count > 0 ? additionalProperties : null
        );
    }

    private static string DecryptAesEcb(byte[] cipherBytes)
    {
        using var aes = Aes.Create();
        aes.Key = BroadcastKey;
        aes.Mode = CipherMode.ECB;
        aes.Padding = PaddingMode.PKCS7;

        using var decryptor = aes.CreateDecryptor();
        var plainBytes = decryptor.TransformFinalBlock(cipherBytes, 0, cipherBytes.Length);

        return System.Text.Encoding.UTF8.GetString(plainBytes);
    }
}
