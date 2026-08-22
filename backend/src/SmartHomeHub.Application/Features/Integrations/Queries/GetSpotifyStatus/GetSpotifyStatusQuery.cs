using Mediator;
using Microsoft.EntityFrameworkCore;
using SmartHomeHub.Application.Common.Interfaces;

namespace SmartHomeHub.Application.Features.Integrations.Queries.GetSpotifyStatus;

public record SpotifyStatusDto(bool Connected, string? DisplayName);

public record GetSpotifyStatusQuery(string FirebaseUid) : IQuery<SpotifyStatusDto>;

public class GetSpotifyStatusQueryHandler(IAppDbContext dbContext)
    : IQueryHandler<GetSpotifyStatusQuery, SpotifyStatusDto>
{
    public async ValueTask<SpotifyStatusDto> Handle(
        GetSpotifyStatusQuery request,
        CancellationToken cancellationToken
    )
    {
        var integration = await dbContext
            .SpotifyIntegrations.AsNoTracking()
            .Include(x => x.User)
            .FirstOrDefaultAsync(
                x => x.User.ExternalAuthUid == request.FirebaseUid,
                cancellationToken
            );

        return integration is null
            ? new SpotifyStatusDto(false, null)
            : new SpotifyStatusDto(true, integration.SpotifyDisplayName);
    }
}
