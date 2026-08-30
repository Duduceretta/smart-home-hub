using SmartHomeHub.Domain.Enums;

namespace SmartHomeHub.Application.Features.Devices.Common;

// Um root device UPnP individual anunciado por um aparelho físico (ex: a TV LG
// anuncia media renderer, DIAL e second-screen como 3 root devices distintos,
// cada um com seu próprio UUID/USN — não é o mesmo UUID com sufixo de serviço).
// Preservado por dispositivo agrupado (ver DiscoveredDeviceDto.UpnpServices) pra
// uso futuro em ações de controle que precisem do endpoint/Location específico
// (ex: DIAL pra lançar app, AVTransport pra play/pause).
public record UpnpServiceInfo(string? Usn, string? SearchTarget, string? Location);

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
    IReadOnlyDictionary<string, string>? AdditionalProperties,
    IReadOnlyList<UpnpServiceInfo>? UpnpServices = null
);
