using System.Net;
using System.Text;
using FluentAssertions;
using SmartHomeHub.Domain.Enums;
using SmartHomeHub.Infrastructure.Discovery.Parsing;

namespace SmartHomeHub.UnitTests.Infrastructure.Discovery.Parsing;

public class MdnsPacketParserTests
{
    private const int HeaderLength = 12;

    private static readonly IPEndPoint RemoteEndPoint = new(IPAddress.Parse("192.168.1.30"), 5353);

    [Fact]
    public void TryParse_ChromecastResponseWithAllRecords_ShouldResolveGoogleCast()
    {
        var builder = new DnsPacketBuilder();

        var ptrNameOffset = builder.Position;
        builder.WriteName("_googlecast._tcp.local");
        builder.WriteUInt16(12); // TYPE PTR
        builder.WriteUInt16(1); // CLASS IN
        builder.WriteUInt32(4500); // TTL

        var ptrRdata = new DnsPacketBuilder();
        ptrRdata.WriteName("device1._googlecast._tcp.local");
        builder.WriteUInt16((ushort)ptrRdata.Position);
        builder.WriteBytes(ptrRdata.ToArray());

        builder.WritePointer(ptrNameOffset + HeaderLength);
        builder.WriteUInt16(33); // TYPE SRV
        builder.WriteUInt16(1);
        builder.WriteUInt32(120);

        var srvRdata = new DnsPacketBuilder();
        srvRdata.WriteUInt16(0); // priority
        srvRdata.WriteUInt16(0); // weight
        srvRdata.WriteUInt16(8009); // port
        srvRdata.WriteName("device1.local");
        builder.WriteUInt16((ushort)srvRdata.Position);
        builder.WriteBytes(srvRdata.ToArray());

        builder.WritePointer(ptrNameOffset + HeaderLength);
        builder.WriteUInt16(1); // TYPE A
        builder.WriteUInt16(1);
        builder.WriteUInt32(120);
        builder.WriteUInt16(4);
        builder.WriteBytes([192, 168, 1, 77]);

        var packet = builder.BuildPacket(answerCount: 3);

        var result = MdnsPacketParser.TryParse(packet, RemoteEndPoint);

        result.Should().NotBeNull();
        result!.IntegrationType.Should().Be(IntegrationType.GoogleCast);
        result.IpAddress.Should().Be("192.168.1.77");
        result.AdditionalProperties.Should().ContainKey("mdns_service");
    }

    [Fact]
    public void TryParse_EspHomeResponseWithTxtId_ShouldUseTxtIdAsExternalId()
    {
        var builder = new DnsPacketBuilder();

        var ptrNameOffset = builder.Position;
        builder.WriteName("_esphomelib._tcp.local");
        builder.WriteUInt16(12);
        builder.WriteUInt16(1);
        builder.WriteUInt32(4500);

        var ptrRdata = new DnsPacketBuilder();
        ptrRdata.WriteName("sensor1._esphomelib._tcp.local");
        builder.WriteUInt16((ushort)ptrRdata.Position);
        builder.WriteBytes(ptrRdata.ToArray());

        builder.WritePointer(ptrNameOffset + HeaderLength);
        builder.WriteUInt16(16); // TYPE TXT
        builder.WriteUInt16(1);
        builder.WriteUInt32(120);

        var txtRdata = new DnsPacketBuilder();
        txtRdata.WriteTxtEntry("id=AABBCCDDEEFF");
        txtRdata.WriteTxtEntry("fn=Sensor de Sala");
        builder.WriteUInt16((ushort)txtRdata.Position);
        builder.WriteBytes(txtRdata.ToArray());

        var packet = builder.BuildPacket(answerCount: 2);

        var result = MdnsPacketParser.TryParse(packet, RemoteEndPoint);

        result.Should().NotBeNull();
        result!.ExternalId.Should().Be("AABBCCDDEEFF");
        result.Name.Should().Be("Sensor de Sala");
        result.IntegrationType.Should().Be(IntegrationType.EspHomeMqtt);
    }

    [Fact]
    public void TryParse_TruncatedPacket_ShouldReturnNull()
    {
        var result = MdnsPacketParser.TryParse([0x00, 0x00, 0x84], RemoteEndPoint);

        result.Should().BeNull();
    }

    [Fact]
    public void TryParse_QueryPacket_WithoutResponseFlag_ShouldReturnNull()
    {
        var builder = new DnsPacketBuilder();
        var packet = builder.BuildPacket(answerCount: 0, isResponse: false);

        var result = MdnsPacketParser.TryParse(packet, RemoteEndPoint);

        result.Should().BeNull();
    }

    private sealed class DnsPacketBuilder
    {
        private readonly List<byte> _bytes = [];

        public int Position => _bytes.Count;

        public void WriteName(string dottedName)
        {
            foreach (var label in dottedName.Split('.', StringSplitOptions.RemoveEmptyEntries))
            {
                var labelBytes = Encoding.UTF8.GetBytes(label);
                _bytes.Add((byte)labelBytes.Length);
                _bytes.AddRange(labelBytes);
            }

            _bytes.Add(0x00);
        }

        public void WritePointer(int targetOffset)
        {
            _bytes.Add((byte)(0xC0 | (targetOffset >> 8)));
            _bytes.Add((byte)(targetOffset & 0xFF));
        }

        public void WriteUInt16(int value)
        {
            _bytes.Add((byte)(value >> 8));
            _bytes.Add((byte)value);
        }

        public void WriteUInt32(uint value)
        {
            _bytes.Add((byte)(value >> 24));
            _bytes.Add((byte)(value >> 16));
            _bytes.Add((byte)(value >> 8));
            _bytes.Add((byte)value);
        }

        public void WriteBytes(byte[] data) => _bytes.AddRange(data);

        public void WriteTxtEntry(string entry)
        {
            var entryBytes = Encoding.UTF8.GetBytes(entry);
            _bytes.Add((byte)entryBytes.Length);
            _bytes.AddRange(entryBytes);
        }

        public byte[] ToArray() => [.. _bytes];

        public byte[] BuildPacket(int answerCount, bool isResponse = true)
        {
            var header = new List<byte> { 0x00, 0x00 }; // ID
            var flags = isResponse ? 0x8400 : 0x0000;
            header.Add((byte)(flags >> 8));
            header.Add((byte)flags);
            header.AddRange([0x00, 0x00]); // QDCOUNT
            header.Add((byte)(answerCount >> 8));
            header.Add((byte)answerCount);
            header.AddRange([0x00, 0x00]); // NSCOUNT
            header.AddRange([0x00, 0x00]); // ARCOUNT

            return [.. header, .. _bytes];
        }
    }
}
