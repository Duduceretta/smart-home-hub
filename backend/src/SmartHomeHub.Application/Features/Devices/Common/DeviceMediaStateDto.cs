namespace SmartHomeHub.Application.Features.Devices.Common;

public record DeviceMediaStateDto(int VolumePercent, bool IsPlaying, string? Title, string? Artist);
