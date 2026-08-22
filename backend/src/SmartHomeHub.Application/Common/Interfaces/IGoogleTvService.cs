using SmartHomeHub.Application.Features.Devices.Common;

namespace SmartHomeHub.Application.Common.Interfaces;

public interface IGoogleTvService
{
    Task SendKeycodeAsync(
        string ipAddress,
        int keycode,
        CancellationToken cancellationToken = default
    );

    Task<bool> GetPowerStateAsync(string ipAddress, CancellationToken cancellationToken = default);

    Task<int> GetVolumePercentAsync(
        string ipAddress,
        CancellationToken cancellationToken = default
    );

    Task SetVolumePercentAsync(
        string ipAddress,
        int volumePercent,
        CancellationToken cancellationToken = default
    );

    Task<MediaSessionInfo?> GetMediaSessionInfoAsync(
        string ipAddress,
        CancellationToken cancellationToken = default
    );
}
