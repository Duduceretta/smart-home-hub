using Mediator;
using Microsoft.EntityFrameworkCore;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Application.Common.Pagination;
using SmartHomeHub.Domain.Enums;

namespace SmartHomeHub.Application.Features.Scenes.Queries.GetScenes;

public record SceneItemDto(
    Guid DeviceId,
    string DeviceName,
    DeviceType DeviceType,
    bool IsOn,
    int? Brightness,
    string? ColorHex,
    int? ColorTempPercent
);

public record SceneDto(
    Guid Id,
    string Name,
    string? Icon,
    DateTimeOffset? LastActivatedAt,
    List<SceneItemDto> Items
);

public record GetScenesQuery(string FirebaseUid, int Page = 1, int PageSize = 10)
    : IQuery<PagedResult<SceneDto>>,
        IPagedQuery;

public class GetScenesQueryHandler(IAppDbContext dbContext)
    : IQueryHandler<GetScenesQuery, PagedResult<SceneDto>>
{
    public async ValueTask<PagedResult<SceneDto>> Handle(
        GetScenesQuery request,
        CancellationToken cancellationToken
    )
    {
        return await dbContext
            .Scenes.AsNoTracking()
            .Where(scene => scene.User.ExternalAuthUid == request.FirebaseUid)
            .OrderBy(scene => scene.Name)
            .ThenBy(scene => scene.Id)
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
            .ToPagedResultAsync(request.Page, request.PageSize, cancellationToken);
    }
}
