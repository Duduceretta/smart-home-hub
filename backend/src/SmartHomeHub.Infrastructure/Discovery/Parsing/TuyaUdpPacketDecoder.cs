using System.Security.Cryptography;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using SmartHomeHub.Application.Features.Devices.Common;
using SmartHomeHub.Domain.Enums;

namespace SmartHomeHub.Infrastructure.Discovery.Parsing;

public static class TuyaUdpPacketDecoder
{
    private static readonly byte[] Prefix = [0x00, 0x00, 0x55, 0xAA];
    private static readonly byte[] Suffix = [0x00, 0x00, 0xAA, 0x55];

    // Magic bytes do frame de anúncio broadcast v3.4/v3.5 (payload AES-GCM em vez de
    // AES-ECB). Confirmado por captura real + descriptografia com o tinytuya em
    // 2026-08-30 (mesma chave fixa do broadcast v3.3, framing igual ao canal de
    // controle do TuyaSessionProtocolClient, mas sem sessão — decripta direto com a
    // chave fixa, não com uma session key negociada).
    private static readonly byte[] GcmPrefix = [0x00, 0x00, 0x66, 0x99];
    private static readonly byte[] GcmSuffix = [0x00, 0x00, 0x99, 0x66];

    // Chave de broadcast fixa e pública do protocolo UDP Tuya (não é segredo do
    // usuário — é a mesma para qualquer instalação). Confirmado lendo o fonte do
    // tinytuya (udp_helper.py): é MD5("yGAdlopoPVldABfn"), não a string crua — usada
    // tanto pro ECB do frame 55AA quanto pro GCM do frame 6699.
    private static readonly byte[] BroadcastKey = MD5.HashData("yGAdlopoPVldABfn"u8.ToArray());

    // logger é opcional pra não forçar todo caller a ter um ILogger à mão (ex: testes),
    // mas é o único jeito de ver por que um pacote foi descartado — antes disso as falhas
    // (exceção de decode ou magic bytes desconhecidos) eram 100% silenciosas.
    public static DiscoveredDeviceDto? TryParse(
        byte[] datagram,
        int sourcePort,
        string sourceIp,
        ILogger? logger = null
    )
    {
        try
        {
            return TryParseCore(datagram, sourcePort, sourceIp);
        }
        catch (Exception ex)
        {
            var hexPrefix = Convert.ToHexString(datagram.AsSpan(0, Math.Min(32, datagram.Length)));
            logger?.LogWarning(
                ex,
                "Falha ao decodificar pacote Tuya UDP de {SourceIp}:{SourcePort} ({Length} bytes, prefixo hex {HexPrefix}): {ExceptionMessage}",
                sourceIp,
                sourcePort,
                datagram.Length,
                hexPrefix,
                ex.Message
            );
            return null;
        }
    }

    private static DiscoveredDeviceDto? TryParseCore(
        byte[] datagram,
        int sourcePort,
        string sourceIp
    )
    {
        if (
            datagram.Length >= 8
            && datagram.AsSpan(0, 4).SequenceEqual(GcmPrefix)
            && datagram.AsSpan(^4).SequenceEqual(GcmSuffix)
        )
        {
            var gcmJson = DecodeGcmBroadcast(datagram);
            return gcmJson is null ? null : BuildDto(gcmJson, sourceIp);
        }

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

        var payloadLength =
            (datagram[12] << 24) | (datagram[13] << 16) | (datagram[14] << 8) | datagram[15];
        const int payloadOffset = 16;
        var payloadEnd = payloadOffset + payloadLength - 8; // desconta CRC(4) + suffix(4) já contados em length

        if (payloadEnd <= payloadOffset || payloadEnd > datagram.Length - Suffix.Length)
        {
            return null;
        }

        var payloadBytes = datagram[payloadOffset..payloadEnd];

        var json =
            sourcePort == 6667
                ? DecryptAesEcb(payloadBytes)
                : System.Text.Encoding.UTF8.GetString(payloadBytes);

        return string.IsNullOrWhiteSpace(json) ? null : BuildDto(json, sourceIp);
    }

    // Frame 6699: prefix(4) + unknown(2) + seqno(4) + cmd(4) + length(4) = header de 18
    // bytes, seguido de nonce(12) + ciphertext + tag(16) + suffix(4). AAD do GCM = bytes
    // [4..18) do header (exclui o prefixo) — mesmo layout do TuyaSessionProtocolClient,
    // mas com BroadcastKey fixa em vez de session key negociada por handshake.
    public static string? DecodeGcmBroadcast(byte[] datagram)
    {
        const int headerLen = 18;
        const int tagLen = 16;

        if (datagram.Length < headerLen + 12 + tagLen + 4)
        {
            return null;
        }

        var nonce = datagram[headerLen..(headerLen + 12)];
        var ciphertext = datagram[(headerLen + 12)..^(tagLen + 4)];
        var tag = datagram[^(tagLen + 4)..^4];
        var aad = datagram.AsSpan(4, headerLen - 4);

        var plain = new byte[ciphertext.Length];
        using (var gcm = new AesGcm(BroadcastKey, tagLen))
        {
            gcm.Decrypt(nonce, ciphertext, tag, plain, aad);
        }

        // Payloads de anúncio não carregam o prefixo de retcode(4) usado nas respostas
        // de comando — confirmado por captura real (payload já começa direto com '{').
        // Ainda assim replica a heurística do tinytuya (no_retcode=None) por segurança:
        // se não começar com '{' mas os 4 bytes seguintes começarem, é retcode.
        var json = System.Text.Encoding.UTF8.GetString(plain).TrimEnd('\0');
        if (json.Length > 4 && json[0] != '{' && json[4] == '{')
        {
            json = json[4..];
        }

        return string.IsNullOrWhiteSpace(json) ? null : json;
    }

    private static DiscoveredDeviceDto? BuildDto(string json, string sourceIp)
    {
        using var document = JsonDocument.Parse(json);
        var root = document.RootElement;

        var gwId = root.TryGetProperty("gwId", out var gwIdElement)
            ? gwIdElement.GetString()
            : null;
        if (string.IsNullOrEmpty(gwId))
        {
            return null;
        }

        var ip = root.TryGetProperty("ip", out var ipElement) ? ipElement.GetString() : sourceIp;
        var productKey = root.TryGetProperty("productKey", out var pkElement)
            ? pkElement.GetString()
            : null;
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
