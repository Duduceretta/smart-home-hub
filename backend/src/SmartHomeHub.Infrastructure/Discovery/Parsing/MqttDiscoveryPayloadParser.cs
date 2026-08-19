using System.Text.Json;
using SmartHomeHub.Application.Features.Devices.Common;
using SmartHomeHub.Domain.Enums;

namespace SmartHomeHub.Infrastructure.Discovery.Parsing;

public static class MqttDiscoveryPayloadParser
{
    private static readonly Dictionary<string, DeviceType> ComponentToDeviceType = new(
        StringComparer.OrdinalIgnoreCase
    )
    {
        ["light"] = DeviceType.Light,
        ["switch"] = DeviceType.Switch,
        ["sensor"] = DeviceType.Sensor,
        ["climate"] = DeviceType.Thermostat,
        ["camera"] = DeviceType.Camera,
        ["lock"] = DeviceType.Lock,
        ["alarm_control_panel"] = DeviceType.Alarm,
        ["media_player"] = DeviceType.Television,
    };

    public static DiscoveredDeviceDto? TryParse(string topic, string payload)
    {
        try
        {
            return TryParseCore(topic, payload);
        }
        catch (Exception)
        {
            return null;
        }
    }

    private static DiscoveredDeviceDto? TryParseCore(string topic, string payload)
    {
        if (string.IsNullOrWhiteSpace(payload))
        {
            return null;
        }

        using var document = JsonDocument.Parse(
            payload,
            new JsonDocumentOptions { AllowTrailingCommas = true }
        );
        var root = document.RootElement;

        var uniqueId = TryGetString(root, "unique_id");
        string? deviceIdentifier = null;

        if (root.TryGetProperty("device", out var deviceElement) && deviceElement.ValueKind == JsonValueKind.Object)
        {
            if (
                deviceElement.TryGetProperty("identifiers", out var identifiersElement)
                && identifiersElement.ValueKind == JsonValueKind.Array
            )
            {
                var first = identifiersElement.EnumerateArray().FirstOrDefault();
                deviceIdentifier = first.ValueKind == JsonValueKind.String ? first.GetString() : null;
            }
        }

        var externalId = uniqueId ?? deviceIdentifier ?? $"mqtt:{topic}";

        var name = TryGetString(root, "name")
            ?? (
                root.TryGetProperty("device", out var deviceNameElement)
                && deviceNameElement.ValueKind == JsonValueKind.Object
                    ? TryGetString(deviceNameElement, "name")
                    : null
            )
            ?? "Dispositivo MQTT";

        var brand =
            (
                root.TryGetProperty("device", out var deviceBrandElement)
                && deviceBrandElement.ValueKind == JsonValueKind.Object
                    ? TryGetString(deviceBrandElement, "manufacturer")
                    : null
            ) ?? "ESPHome";

        var component = ExtractComponent(topic);
        var type = component is not null && ComponentToDeviceType.TryGetValue(component, out var mappedType)
            ? mappedType
            : DeviceType.Sensor;

        var commandTopic = TryGetString(root, "command_topic");
        var stateTopic = TryGetString(root, "state_topic");

        var additionalProperties = new Dictionary<string, string>();
        if (commandTopic is not null)
        {
            additionalProperties["command_topic"] = commandTopic;
        }
        if (stateTopic is not null)
        {
            additionalProperties["state_topic"] = stateTopic;
        }

        return new DiscoveredDeviceDto(
            TemporaryId: Guid.NewGuid().ToString(),
            Name: name,
            Brand: brand,
            ExternalId: externalId,
            Type: type,
            IntegrationType: IntegrationType.EspHomeMqtt,
            IpAddress: null,
            MacAddress: null,
            SignalStrength: null,
            AdditionalProperties: additionalProperties.Count > 0 ? additionalProperties : null
        );
    }

    private static string? TryGetString(JsonElement element, string propertyName) =>
        element.TryGetProperty(propertyName, out var value) && value.ValueKind == JsonValueKind.String
            ? value.GetString()
            : null;

    private static string? ExtractComponent(string topic)
    {
        var segments = topic.Split('/', StringSplitOptions.RemoveEmptyEntries);
        return segments.Length >= 2 ? segments[1] : null;
    }
}
