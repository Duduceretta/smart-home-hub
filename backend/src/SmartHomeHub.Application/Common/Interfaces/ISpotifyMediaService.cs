using SmartHomeHub.Application.Features.Devices.Common;

namespace SmartHomeHub.Application.Common.Interfaces;

public interface ISpotifyMediaService
{
    string BuildAuthorizeUrl(string state);

    /// <summary>Troca o `code` do callback por tokens e persiste (upsert) a integração do usuário.</summary>
    Task ExchangeCodeForTokensAsync(
        string firebaseUid,
        string code,
        CancellationToken cancellationToken = default
    );

    Task<DeviceMediaStateDto?> GetCurrentPlaybackAsync(
        string firebaseUid,
        CancellationToken cancellationToken = default
    );

    Task SetVolumeAsync(
        string firebaseUid,
        int volumePercent,
        CancellationToken cancellationToken = default
    );

    Task TogglePlayPauseAsync(string firebaseUid, CancellationToken cancellationToken = default);

    Task SkipToNextAsync(string firebaseUid, CancellationToken cancellationToken = default);

    Task SkipToPreviousAsync(string firebaseUid, CancellationToken cancellationToken = default);
}
