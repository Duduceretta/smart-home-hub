using SmartHomeHub.Domain.Enums;

namespace SmartHomeHub.Application.Features.Devices.Common;

public record DiscoveredDeviceDto(
    string TemporaryId,
    string Name,
    string Brand,
    string ExternalId,
    DeviceType Type,
    IntegrationType IntegrationType,
    string? IpAddress,
    string? MacAddress,
    int? SignalStrength,
    IReadOnlyDictionary<string, string>? AdditionalProperties
);
