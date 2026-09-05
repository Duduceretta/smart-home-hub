namespace SmartHomeHub.Api.Endpoints.Common;

public record MessageResponseDto(string Message);

public record DeviceCreatedResponseDto(string Message, Guid DeviceId);

public record RoomCreatedResponseDto(string Message, Guid RoomId);

public record DeviceGroupCreatedResponseDto(string Message, Guid GroupId);

public record AutomationCreatedResponseDto(string Message, Guid AutomationId);

public record UserSyncResponseDto(string Message, Guid UserId);

public record UpdatedRoomResponseDto(Guid Id, string Name, string Icon);

public record UpdatedDeviceGroupResponseDto(Guid Id, string Name, string? Icon, List<Guid> DeviceIds);

public record UpdatedAutomationResponseDto(Guid Id, string Name, bool IsActive);

public record UpdatedDeviceResponseDto(
    Guid Id,
    string Name,
    string Brand,
    string ExternalId,
    Domain.Enums.DeviceType Type,
    Domain.Enums.IntegrationType IntegrationType,
    Guid? RoomId
);

public record SpotifyAuthorizeUrlResponseDto(string AuthorizeUrl);
