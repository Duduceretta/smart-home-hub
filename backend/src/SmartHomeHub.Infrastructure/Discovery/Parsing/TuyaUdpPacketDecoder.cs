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

    // Magic bytes do protocolo Tuya v3.4/v3.5 (frame novo, payload AES-GCM em vez de
    // AES-ECB). Confirmado por captura real em 2026-08-30: uma lâmpada WiFi Tuya na rede
    // transmite broadcast com esse prefixo/sufixo, não 0x55AA/0xAA55 — por isso cai direto
    // no `return null` de prefixo abaixo e nunca chega a tentar descriptografar. Suporte a
    // esse formato NÃO está implementado (decodificação AES-GCM/nonce/tag ainda não escrita)
    // — as duas constantes abaixo servem só pra identificar esse caso no log de diagnóstico.
    private static readonly byte[] V34Prefix = [0x00, 0x00, 0x66, 0x99];
    private static readonly byte[] V34Suffix = [0x00, 0x00, 0x99, 0x66];

    // Chave de broadcast fixa e pública do protocolo UDP Tuya (não é segredo do usuário).
    // TODO: confirmado em 2026-08-30 lendo o fonte do tinytuya (udp_helper.py) que a chave
    // real usada lá é MD5("yGAdlopoPVldABfn"), não a string crua como aqui. Suspeita forte
    // de que isso É PARTE do motivo do discovery v3.3 nunca ter funcionado — corrigir e
    // validar contra um dispositivo v3.3 real antes de mexer (fora de escopo desta tarefa,
    // que trata do canal de comando v3.4/v3.5, não do discovery).
    private static readonly byte[] BroadcastKey = "yGAdlopoPVldABfn"u8.ToArray();

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
        if (
            datagram.Length >= 8
            && datagram.AsSpan(0, 4).SequenceEqual(V34Prefix)
            && datagram.AsSpan(^4).SequenceEqual(V34Suffix)
        )
        {
            logger?.LogDebug(
                "Pacote Tuya UDP de {SourceIp}:{SourcePort} usa protocolo v3.4/v3.5 (magic 0x6699) — decodificação não suportada, descartado.",
                sourceIp,
                sourcePort
            );
            return null;
        }

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
