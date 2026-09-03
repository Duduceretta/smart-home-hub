using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using FluentAssertions;
using SmartHomeHub.Domain.Enums;
using SmartHomeHub.Infrastructure.Discovery.Parsing;

namespace SmartHomeHub.UnitTests.Infrastructure.Discovery.Parsing;

public class TuyaUdpPacketDecoderTests
{
    // Chave real usada pelo decoder é MD5("yGAdlopoPVldABfn") — confirmado no fonte do
    // tinytuya (udp_helper.py). Antes desta correção o decoder usava a string crua
    // como chave, o que quebrava silenciosamente o decode ECB de qualquer dispositivo
    // v3.3 real (só não era percebido porque os testes também erravam a mesma forma).
    private static readonly byte[] BroadcastKey = MD5.HashData("yGAdlopoPVldABfn"u8.ToArray());

    [Fact]
    public void TryParse_WithPlainJsonOnPort6666_ShouldReturnDto()
    {
        var json =
            """{"ip":"192.168.1.20","gwId":"abc123def456","active":2,"productKey":"pk1","version":"3.3"}""";
        var datagram = BuildPacket(Encoding.UTF8.GetBytes(json));

        var result = TuyaUdpPacketDecoder.TryParse(datagram, 6666, "192.168.1.20");

        result.Should().NotBeNull();
        result!.ExternalId.Should().Be("abc123def456");
        result.IpAddress.Should().Be("192.168.1.20");
        result.IntegrationType.Should().Be(IntegrationType.TuyaLocal);
        result.AdditionalProperties.Should().ContainKey("tuya_product_key");
    }

    [Fact]
    public void TryParse_WithEncryptedPayloadOnPort6667_ShouldDecryptWithMd5DerivedKeyAndReturnDto()
    {
        var json = """{"ip":"192.168.1.21","gwId":"encrypted789","active":2}""";
        var encrypted = EncryptAesEcb(Encoding.UTF8.GetBytes(json));
        var datagram = BuildPacket(encrypted);

        var result = TuyaUdpPacketDecoder.TryParse(datagram, 6667, "192.168.1.21");

        result.Should().NotBeNull();
        result!.ExternalId.Should().Be("encrypted789");
    }

    [Fact]
    public void TryParse_WithGcmBroadcastFrame_ShouldDecryptAndReturnDto()
    {
        // Golden vector gerado com o tinytuya real (mesma chave fixa de broadcast,
        // dados sintéticos) — reproduz byte a byte o formato confirmado por captura
        // ao vivo do broadcast v3.5 de um dispositivo real (magic 0x6699/0x9966).
        var frameHex =
            "0000669900000000000000000000000000e53031323334353637383961627f0e8c5c409ea2eaa8b6c4436693f733313ecd36aeaada5e4d17a3aa76a342835d5f8ca76a306c7440c16a59168cefa4add15ee8d10429afc776e7b02f2a0090261d8074eb2b1df5db8f3a10c3c760bce32294892f6fc11728c66a014cf67ea646a0e4524c5f13fd82daa7183e19a9d64d266f7eb16f00f67ae57fef02f8062524e51cdef46056421428db8e1296e580fb17d669e45a0feb10c4e6ab890c8225bb89e2a4970abee244791edcc5eab277496caf6904e542de7ff8a1e199219646f495969befa988dda37d673e300873f88f216f3403c5555db100009966";
        var datagram = Convert.FromHexString(frameHex);

        var result = TuyaUdpPacketDecoder.TryParse(datagram, 6667, "192.168.1.99");

        result.Should().NotBeNull();
        result!.ExternalId.Should().Be("golden0testgwid0");
        result.IpAddress.Should().Be("192.168.1.99");
        result.IntegrationType.Should().Be(IntegrationType.TuyaLocal);
        result.AdditionalProperties.Should().ContainKey("tuya_protocol_version");
        result.AdditionalProperties!["tuya_protocol_version"].Should().Be("3.5");
    }

    [Fact]
    public void DecodeGcmBroadcast_WithGoldenVector_ShouldReturnExactPlaintextJson()
    {
        var frameHex =
            "0000669900000000000000000000000000e53031323334353637383961627f0e8c5c409ea2eaa8b6c4436693f733313ecd36aeaada5e4d17a3aa76a342835d5f8ca76a306c7440c16a59168cefa4add15ee8d10429afc776e7b02f2a0090261d8074eb2b1df5db8f3a10c3c760bce32294892f6fc11728c66a014cf67ea646a0e4524c5f13fd82daa7183e19a9d64d266f7eb16f00f67ae57fef02f8062524e51cdef46056421428db8e1296e580fb17d669e45a0feb10c4e6ab890c8225bb89e2a4970abee244791edcc5eab277496caf6904e542de7ff8a1e199219646f495969befa988dda37d673e300873f88f216f3403c5555db100009966";
        var datagram = Convert.FromHexString(frameHex);

        var json = TuyaUdpPacketDecoder.DecodeGcmBroadcast(datagram);

        json.Should().NotBeNull();
        using var document = JsonDocument.Parse(json!);
        document.RootElement.GetProperty("gwId").GetString().Should().Be("golden0testgwid0");
        document.RootElement.GetProperty("productKey").GetString().Should().Be("goldenProductKey");
    }

    [Fact]
    public void TryParse_WithInvalidPrefix_ShouldReturnNull()
    {
        var datagram = new byte[24];

        var result = TuyaUdpPacketDecoder.TryParse(datagram, 6666, "192.168.1.1");

        result.Should().BeNull();
    }

    [Fact]
    public void TryParse_WithTooShortDatagram_ShouldReturnNull()
    {
        var result = TuyaUdpPacketDecoder.TryParse([0x00, 0x00, 0x55, 0xAA], 6666, "192.168.1.1");

        result.Should().BeNull();
    }

    private static byte[] BuildPacket(byte[] payload)
    {
        var payloadLength = payload.Length + 8;
        using var stream = new MemoryStream();

        stream.Write([0x00, 0x00, 0x55, 0xAA]); // prefix
        stream.Write([0x00, 0x00, 0x00, 0x01]); // seq
        stream.Write([0x00, 0x00, 0x00, 0x00]); // cmd
        stream.Write([
            (byte)(payloadLength >> 24),
            (byte)(payloadLength >> 16),
            (byte)(payloadLength >> 8),
            (byte)payloadLength,
        ]);
        stream.Write(payload);
        stream.Write([0x00, 0x00, 0x00, 0x00]); // crc (não validado pelo decoder)
        stream.Write([0x00, 0x00, 0xAA, 0x55]); // suffix

        return stream.ToArray();
    }

    private static byte[] EncryptAesEcb(byte[] plainBytes)
    {
        using var aes = Aes.Create();
        aes.Key = BroadcastKey;
        aes.Mode = CipherMode.ECB;
        aes.Padding = PaddingMode.PKCS7;

        using var encryptor = aes.CreateEncryptor();
        return encryptor.TransformFinalBlock(plainBytes, 0, plainBytes.Length);
    }
}
