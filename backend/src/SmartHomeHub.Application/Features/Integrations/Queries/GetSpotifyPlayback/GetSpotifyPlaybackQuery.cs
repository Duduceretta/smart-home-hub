using Mediator;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Application.Features.Devices.Common;

namespace SmartHomeHub.Application.Features.Integrations.Queries.GetSpotifyPlayback;

public record GetSpotifyPlaybackQuery(string FirebaseUid) : IQuery<DeviceMediaStateDto?>;

public class GetSpotifyPlaybackQueryHandler(ISpotifyMediaService spotifyMediaService)
    : IQueryHandler<GetSpotifyPlaybackQuery, DeviceMediaStateDto?>
{
    public async ValueTask<DeviceMediaStateDto?> Handle(
        GetSpotifyPlaybackQuery request,
        CancellationToken cancellationToken
    )
    {
        return await spotifyMediaService.GetCurrentPlaybackAsync(
            request.FirebaseUid,
            cancellationToken
        );
    }
}
