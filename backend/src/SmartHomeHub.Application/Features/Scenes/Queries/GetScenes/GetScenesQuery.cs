using Mediator;
using Microsoft.EntityFrameworkCore;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Application.Common.Mappings;
using SmartHomeHub.Application.Common.Pagination;
using SmartHomeHub.Application.Common.Search;
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

/// <param name="Search">Texto livre: casa com o nome da cena ou de qualquer dispositivo dela.</param>
/// <param name="Room">Nome do ambiente (ou "Sem cômodo"): só cenas com algum dispositivo nele.</param>
public record GetScenesQuery(
    string FirebaseUid,
    int Page = 1,
    int PageSize = 10,
    string? Search = null,
    string? Room = null
) : IQuery<PagedResult<SceneDto>>, IPagedQuery, ISearchableQuery;

public class GetScenesQueryHandler(IAppDbContext dbContext)
    : IQueryHandler<GetScenesQuery, PagedResult<SceneDto>>
{
    public async ValueTask<PagedResult<SceneDto>> Handle(
        GetScenesQuery request,
        CancellationToken cancellationToken
    )
    {
        var scenes = dbContext
            .Scenes.AsNoTracking()
            .Where(scene => scene.User.ExternalAuthUid == request.FirebaseUid);

        var room = request.Room?.Trim();

        if (!string.IsNullOrEmpty(room))
        {
            scenes =
                room == RoomNames.NoRoom
                    ? scenes.Where(scene => scene.Items.Any(item => item.Device.RoomId == null))
                    : scenes.Where(scene =>
                        scene.Items.Any(item =>
                            item.Device.Room != null && item.Device.Room.Name == room
                        )
                    );
        }

        var pattern = SearchExtensions.CreatePattern(request.Search);

        // Nome da cena OU de qualquer dispositivo dela, sem distinguir caixa nem acento. A
        // busca por campos simples é o ApplySearch; aqui passa por uma coleção, então o
        // predicado é montado à mão com as mesmas peças.
        if (pattern is not null)
        {
            scenes = scenes.Where(scene =>
                EF.Functions.Like(
                    SearchFunctions.Unaccent(scene.Name.ToLower()),
                    SearchFunctions.Unaccent(pattern),
                    SearchExtensions.EscapeCharacter
                )
                || scene.Items.Any(item =>
                    EF.Functions.Like(
                        SearchFunctions.Unaccent(item.Device.Name.ToLower()),
                        SearchFunctions.Unaccent(pattern),
                        SearchExtensions.EscapeCharacter
                    )
                )
            );
        }

        return await scenes
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
