using FluentAssertions;
using SmartHomeHub.Infrastructure.Services;

namespace SmartHomeHub.UnitTests.Infrastructure.Services;

public class WakeOnLanServiceTests
{
    private static byte[] ExpectedPacket(byte[] macBytes)
    {
        var packet = new byte[102];
        for (var i = 0; i < 6; i++)
            packet[i] = 0xFF;
        for (var i = 1; i <= 16; i++)
            Buffer.BlockCopy(macBytes, 0, packet, i * 6, 6);
        return packet;
    }

    [Fact]
    public void BuildMagicPacket_WithColonSeparatedMac_ShouldReturn102Bytes()
    {
        var macBytes = new byte[] { 0xAA, 0xBB, 0xCC, 0x11, 0x22, 0x33 };

        var packet = WakeOnLanService.BuildMagicPacket("AA:BB:CC:11:22:33");

        packet.Should().Equal(ExpectedPacket(macBytes));
    }

    [Fact]
    public void BuildMagicPacket_WithHyphenSeparatedMac_ShouldReturnSameBytesAsColonSeparated()
    {
        var macBytes = new byte[] { 0xAA, 0xBB, 0xCC, 0x11, 0x22, 0x33 };

        var packet = WakeOnLanService.BuildMagicPacket("AA-BB-CC-11-22-33");

        packet.Should().Equal(ExpectedPacket(macBytes));
    }

    [Fact]
    public void BuildMagicPacket_WithoutSeparators_ShouldReturnSameBytesAsSeparated()
    {
        var macBytes = new byte[] { 0xAA, 0xBB, 0xCC, 0x11, 0x22, 0x33 };

        var packet = WakeOnLanService.BuildMagicPacket("AABBCC112233");

        packet.Should().Equal(ExpectedPacket(macBytes));
    }

    [Fact]
    public void BuildMagicPacket_ShouldStartWith6BytesOf0xFF()
    {
        var packet = WakeOnLanService.BuildMagicPacket("AA:BB:CC:11:22:33");

        packet.Take(6).Should().AllBeEquivalentTo((byte)0xFF);
    }

    [Fact]
    public void BuildMagicPacket_WithInvalidMacFormat_ShouldThrowArgumentException()
    {
        var act = () => WakeOnLanService.BuildMagicPacket("not-a-mac");

        act.Should().Throw<ArgumentException>();
    }
}
