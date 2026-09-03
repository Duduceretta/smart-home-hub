using System.Net;
using FluentAssertions;
using SmartHomeHub.Domain.Enums;
using SmartHomeHub.Infrastructure.Discovery.Parsing;

namespace SmartHomeHub.UnitTests.Infrastructure.Discovery.Parsing;

public class SsdpResponseParserTests
{
    private static readonly IPEndPoint RemoteEndPoint = new(IPAddress.Parse("192.168.1.50"), 1900);

    [Fact]
    public void TryParseAnnouncement_WithCompleteResponse_ShouldReturnAnnouncement()
    {
        var raw =
            "HTTP/1.1 200 OK\r\n"
            + "CACHE-CONTROL: max-age=1800\r\n"
            + "ST: urn:schemas-upnp-org:device:MediaRenderer:1\r\n"
            + "USN: uuid:4d696e69-1dd2-11b2-8f6a-aabbccddeeff::urn:schemas-upnp-org:device:MediaRenderer:1\r\n"
            + "LOCATION: http://192.168.1.50:9197/description.xml\r\n"
            + "SERVER: Linux/3.14 UPnP/1.0 MyTV/1.0\r\n\r\n";

        var result = SsdpResponseParser.TryParseAnnouncement(raw, RemoteEndPoint);

        result.Should().NotBeNull();
        result!.RemoteAddress.Should().Be(IPAddress.Parse("192.168.1.50"));
        result.SearchTarget.Should().Be("urn:schemas-upnp-org:device:MediaRenderer:1");
        result.Location.Should().Be("http://192.168.1.50:9197/description.xml");
    }

    [Fact]
    public void TryParseAnnouncement_WithLowercaseHeaders_ShouldParseCaseInsensitively()
    {
        var raw =
            "HTTP/1.1 200 OK\r\n"
            + "st: ssdp:all\r\n"
            + "usn: uuid:aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee\r\n\r\n";

        var result = SsdpResponseParser.TryParseAnnouncement(raw, RemoteEndPoint);

        result.Should().NotBeNull();
        result!.Usn.Should().Be("uuid:aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee");
    }

    [Fact]
    public void TryParseAnnouncement_WithMalformedResponse_ShouldReturnNull()
    {
        SsdpResponseParser
            .TryParseAnnouncement("NOT A VALID SSDP RESPONSE", RemoteEndPoint)
            .Should()
            .BeNull();
    }

    [Fact]
    public void TryParseAnnouncement_WithEmptyString_ShouldReturnNull()
    {
        SsdpResponseParser.TryParseAnnouncement(string.Empty, RemoteEndPoint).Should().BeNull();
    }

    [Fact]
    public void IsControllable_GroupWithDialService_ShouldReturnTrue()
    {
        var group = new[]
        {
            new SsdpAnnouncement(
                RemoteEndPoint.Address,
                "uuid:a::upnp:rootdevice",
                "upnp:rootdevice",
                null,
                null,
                null
            ),
            new SsdpAnnouncement(
                RemoteEndPoint.Address,
                "uuid:a::urn:dial-multiscreen-org:service:dial:1",
                "urn:dial-multiscreen-org:service:dial:1",
                null,
                null,
                null
            ),
        };

        SsdpResponseParser.IsControllable(group).Should().BeTrue();
    }

    [Fact]
    public void IsControllable_GroupWithOnlyGenericRootDevice_ShouldReturnFalse()
    {
        var group = new[]
        {
            new SsdpAnnouncement(
                RemoteEndPoint.Address,
                "uuid:a::upnp:rootdevice",
                "upnp:rootdevice",
                null,
                null,
                null
            ),
        };

        SsdpResponseParser.IsControllable(group).Should().BeFalse();
    }

    [Fact]
    public void IsGateway_GroupWithInternetGatewayDeviceService_ShouldReturnTrue()
    {
        var group = new[]
        {
            new SsdpAnnouncement(
                RemoteEndPoint.Address,
                "uuid:router::urn:schemas-upnp-org:service:WANIPConnection:1",
                "urn:schemas-upnp-org:service:WANIPConnection:1",
                null,
                null,
                null
            ),
        };

        SsdpResponseParser.IsGateway(group).Should().BeTrue();
    }

    [Fact]
    public void IsGateway_TvGroup_ShouldReturnFalse()
    {
        var group = new[]
        {
            new SsdpAnnouncement(
                RemoteEndPoint.Address,
                "uuid:tv::urn:schemas-upnp-org:service:AVTransport:1",
                "urn:schemas-upnp-org:service:AVTransport:1",
                null,
                null,
                null
            ),
        };

        SsdpResponseParser.IsGateway(group).Should().BeFalse();
    }

    [Fact]
    public void ResolveDisplayName_WithFriendlyNameFromXml_ShouldTakePriorityOverEverything()
    {
        var group = new[]
        {
            new SsdpAnnouncement(
                RemoteEndPoint.Address,
                null,
                null,
                null,
                "WebOS/4.1.0 UPnP/1.0",
                "Generic DLNA Name"
            ),
        };

        SsdpResponseParser
            .ResolveDisplayName(group, "[LG] webOS TV LJ5500")
            .Should()
            .Be("[LG] webOS TV LJ5500");
    }

    [Fact]
    public void ResolveDisplayName_WithoutXmlFriendlyName_ShouldFallBackToDlnaDeviceName()
    {
        var group = new[]
        {
            new SsdpAnnouncement(
                RemoteEndPoint.Address,
                null,
                null,
                null,
                "WebOS/4.1.0 UPnP/1.0",
                null
            ),
            new SsdpAnnouncement(
                RemoteEndPoint.Address,
                null,
                null,
                null,
                "Linux/i686 UPnP/1,0 DLNADOC/1.50 LGE WebOS TV/Version 0.9",
                "[LG] webOS TV LJ5500"
            ),
        };

        SsdpResponseParser
            .ResolveDisplayName(group, friendlyNameFromXml: null)
            .Should()
            .Be("[LG] webOS TV LJ5500");
    }

    [Fact]
    public void ResolveDisplayName_WithOnlyServerHeader_ShouldFallBackToParsedBrand()
    {
        // ExtractBrand pega o penúltimo token do SERVER header (comportamento
        // pré-existente, preservado) — não necessariamente o nome comercial.
        var group = new[]
        {
            new SsdpAnnouncement(
                RemoteEndPoint.Address,
                null,
                null,
                null,
                "Linux/3.14 MyBrand/2.0 UPnP/1.0",
                null
            ),
        };

        SsdpResponseParser
            .ResolveDisplayName(group, friendlyNameFromXml: null)
            .Should()
            .Be("Dispositivo UPnP (MyBrand)");
    }

    [Fact]
    public void BuildDeviceDto_WithMultipleAnnouncementsForSameIp_ShouldPreserveAllAsUpnpServices()
    {
        var group = new[]
        {
            new SsdpAnnouncement(
                RemoteEndPoint.Address,
                "uuid:a::upnp:rootdevice",
                "upnp:rootdevice",
                "http://192.168.1.50:1800/",
                null,
                null
            ),
            new SsdpAnnouncement(
                RemoteEndPoint.Address,
                "uuid:b::urn:dial-multiscreen-org:service:dial:1",
                "urn:dial-multiscreen-org:service:dial:1",
                "http://192.168.1.50:1885/",
                null,
                null
            ),
        };

        var dto = SsdpResponseParser.BuildDeviceDto(group, "TV Teste", "LGE");

        dto.ExternalId.Should().Be("ssdp:192.168.1.50");
        dto.IntegrationType.Should().Be(IntegrationType.SsdpUpnp);
        dto.UpnpServices.Should().HaveCount(2);
        dto.UpnpServices.Should()
            .Contain(s => s.SearchTarget == "urn:dial-multiscreen-org:service:dial:1");
    }
}
