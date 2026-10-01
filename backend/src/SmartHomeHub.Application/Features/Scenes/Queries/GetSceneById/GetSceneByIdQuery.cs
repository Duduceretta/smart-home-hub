using Mediator;
using Microsoft.EntityFrameworkCore;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Application.Features.Scenes.Queries.GetScenes;
using SmartHomeHub.Domain.Common.Primitives;

namespace SmartHomeHub.Application.Features.Scenes.Queries.GetSceneById;

public record GetSceneByIdQuery(Guid SceneId, string FirebaseUid) : IQuery<Result<SceneDto>>;

public class GetSceneByIdQueryHandler(IAppDbContext dbContext)
    : IQueryHandler<GetSceneByIdQuery, Result<SceneDto>>
{
    public async ValueTask<Result<SceneDto>> Handle(
        GetSceneByIdQuery request,
        CancellationToken cancellationToken
    )
    {
        var scene = await dbContext
            .Scenes.AsNoTracking()
            .Where(scene =>
                scene.Id == request.SceneId && scene.User.ExternalAuthUid == request.FirebaseUid
            )
            .Select(scene => new SceneDto(
                scene.Id,
                scene.Name,
                scene.Icon,
                scene.LastActivatedAt,
                scene
                    .Items.Select(item => new SceneItemDto(
                        item.DeviceId,
                        item.Device.Name,
                        item.Device.Type,
                        item.IsOn,
                        item.Brightness,
                        item.ColorHex,
                        item.ColorTempPercent
                    ))
                    .ToList()
            ))
            .FirstOrDefaultAsync(cancellationToken);

        return scene is null
            ? Result.Failure<SceneDto>(
                new Error("Scene.NotFound", "Cena não encontrada ou sem permissão de acesso.")
            )
            : Result.Success(scene);
    }
}
