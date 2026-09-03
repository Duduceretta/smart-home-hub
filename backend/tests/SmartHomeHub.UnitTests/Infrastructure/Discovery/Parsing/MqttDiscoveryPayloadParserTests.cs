using FluentAssertions;
using SmartHomeHub.Domain.Enums;
using SmartHomeHub.Infrastructure.Discovery.Parsing;

namespace SmartHomeHub.UnitTests.Infrastructure.Discovery.Parsing;

public class MqttDiscoveryPayloadParserTests
{
    [Fact]
    public void TryParse_SwitchComponentWithUniqueId_ShouldMapDeviceTypeAndExternalId()
    {
        var payload = """
            {
                "name": "Tomada Sala",
                "unique_id": "esp32_switch_01",
                "state_topic": "esphome/switch01/state",
                "command_topic": "esphome/switch01/command",
                "device": { "manufacturer": "Espressif", "identifiers": ["esp32-aabbcc"] }
            }
            """;

        var result = MqttDiscoveryPayloadParser.TryParse(
            "homeassistant/switch/livingroom/config",
            payload
        );

        result.Should().NotBeNull();
        result!.Type.Should().Be(DeviceType.Switch);
        result.IntegrationType.Should().Be(IntegrationType.EspHomeMqtt);
        result.ExternalId.Should().Be("esp32_switch_01");
        result.Brand.Should().Be("Espressif");
        result.AdditionalProperties.Should().ContainKey("command_topic");
    }

    [Fact]
    public void TryParse_WithoutUniqueId_ShouldFallbackToDeviceIdentifier()
    {
        var payload = """
            {
                "name": "Sensor Temperatura",
                "device": { "identifiers": ["esp32-ddeeff"] }
            }
            """;

        var result = MqttDiscoveryPayloadParser.TryParse(
            "homeassistant/sensor/quarto/temp/config",
            payload
        );

        result.Should().NotBeNull();
        result!.ExternalId.Should().Be("esp32-ddeeff");
        result.Type.Should().Be(DeviceType.Sensor);
    }

    [Fact]
    public void TryParse_WithUnknownComponent_ShouldDefaultToSensor()
    {
        var payload = """{"unique_id": "generic-01"}""";

        var result = MqttDiscoveryPayloadParser.TryParse(
            "homeassistant/vacuum/robot/config",
            payload
        );

        result.Should().NotBeNull();
        result!.Type.Should().Be(DeviceType.Sensor);
    }

    [Fact]
    public void TryParse_WithMalformedJson_ShouldReturnNull()
    {
        var result = MqttDiscoveryPayloadParser.TryParse(
            "homeassistant/switch/x/config",
            "{ not valid json"
        );

        result.Should().BeNull();
    }

    [Fact]
    public void TryParse_WithEmptyPayload_ShouldReturnNull()
    {
        var result = MqttDiscoveryPayloadParser.TryParse(
            "homeassistant/switch/x/config",
            string.Empty
        );

        result.Should().BeNull();
    }
}
