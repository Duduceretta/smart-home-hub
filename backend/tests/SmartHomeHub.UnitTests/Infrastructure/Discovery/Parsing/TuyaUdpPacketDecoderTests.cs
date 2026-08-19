using System.Security.Cryptography;
using System.Text;
using FluentAssertions;
using SmartHomeHub.Domain.Enums;
using SmartHomeHub.Infrastructure.Discovery.Parsing;

namespace SmartHomeHub.UnitTests.Infrastructure.Discovery.Parsing;

public class TuyaUdpPacketDecoderTests
{
    private static readonly byte[] BroadcastKey = "yGAdlopoPVldABfn"u8.ToArray();

    [Fact]
    public void TryParse_WithPlainJsonOnPort6666_ShouldReturnDto()
    {
        var json = """{"ip":"192.168.1.20","gwId":"abc123def456","active":2,"productKey":"pk1","version":"3.3"}""";
        var datagram = BuildPacket(Encoding.UTF8.GetBytes(json));

        var result = TuyaUdpPacketDecoder.TryParse(datagram, 6666, "192.168.1.20");

        result.Should().NotBeNull();
        result!.ExternalId.Should().Be("abc123def456");
        result.IpAddress.Should().Be("192.168.1.20");
        result.IntegrationType.Should().Be(IntegrationType.TuyaLocal);
        result.AdditionalProperties.Should().ContainKey("tuya_product_key");
    }

    [Fact]
    public void TryParse_WithEncryptedPayloadOnPort6667_ShouldDecryptAndReturnDto()
    {
        var json = """{"ip":"192.168.1.21","gwId":"encrypted789","active":2}""";
        var encrypted = EncryptAesEcb(Encoding.UTF8.GetBytes(json));
        var datagram = BuildPacket(encrypted);

        var result = TuyaUdpPacketDecoder.TryParse(datagram, 6667, "192.168.1.21");

        result.Should().NotBeNull();
        result!.ExternalId.Should().Be("encrypted789");
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
        stream.Write(
            [
                (byte)(payloadLength >> 24),
                (byte)(payloadLength >> 16),
                (byte)(payloadLength >> 8),
                (byte)payloadLength,
            ]
        );
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
