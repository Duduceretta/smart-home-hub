using System.Net;
using FluentAssertions;
using SmartHomeHub.Domain.Enums;
using SmartHomeHub.Infrastructure.Discovery.Parsing;

namespace SmartHomeHub.UnitTests.Infrastructure.Discovery.Parsing;

public class SsdpResponseParserTests
{
    private static readonly IPEndPoint RemoteEndPoint = new(IPAddress.Parse("192.168.1.50"), 1900);

    [Fact]
    public void TryParse_WithCompleteResponse_ShouldReturnDto()
    {
        var raw =
            "HTTP/1.1 200 OK\r\n"
            + "CACHE-CONTROL: max-age=1800\r\n"
            + "ST: urn:schemas-upnp-org:device:MediaRenderer:1\r\n"
            + "USN: uuid:4d696e69-1dd2-11b2-8f6a-aabbccddeeff::urn:schemas-upnp-org:device:MediaRenderer:1\r\n"
            + "LOCATION: http://192.168.1.50:9197/description.xml\r\n"
            + "SERVER: Linux/3.14 UPnP/1.0 MyTV/1.0\r\n\r\n";

        var result = SsdpResponseParser.TryParse(raw, RemoteEndPoint);

        result.Should().NotBeNull();
        result!.IntegrationType.Should().Be(IntegrationType.SsdpUpnp);
        result.ExternalId.Should().Be("4d696e69-1dd2-11b2-8f6a-aabbccddeeff");
        result.IpAddress.Should().Be("192.168.1.50");
        result.AdditionalProperties.Should().ContainKey("ssdp_location");
    }

    [Fact]
    public void TryParse_WithoutUsn_ShouldFallbackExternalIdToIp()
    {
        var raw = "HTTP/1.1 200 OK\r\n" + "ST: ssdp:all\r\n\r\n";

        var result = SsdpResponseParser.TryParse(raw, RemoteEndPoint);

        result.Should().NotBeNull();
        result!.ExternalId.Should().Be("ssdp:192.168.1.50");
    }

    [Fact]
    public void TryParse_WithLowercaseHeaders_ShouldParseCaseInsensitively()
    {
        var raw =
            "HTTP/1.1 200 OK\r\n"
            + "st: ssdp:all\r\n"
            + "usn: uuid:aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee\r\n\r\n";

        var result = SsdpResponseParser.TryParse(raw, RemoteEndPoint);

        result.Should().NotBeNull();
        result!.ExternalId.Should().Be("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee");
    }

    [Fact]
    public void TryParse_WithMalformedResponse_ShouldReturnNull()
    {
        var raw = "NOT A VALID SSDP RESPONSE";

        var result = SsdpResponseParser.TryParse(raw, RemoteEndPoint);

        result.Should().BeNull();
    }

    [Fact]
    public void TryParse_WithEmptyString_ShouldReturnNull()
    {
        var result = SsdpResponseParser.TryParse(string.Empty, RemoteEndPoint);

        result.Should().BeNull();
    }
}
