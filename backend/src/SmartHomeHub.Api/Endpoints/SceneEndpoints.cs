using System.Security.Claims;
using Mediator;
using SmartHomeHub.Api.Endpoints.Common;
using SmartHomeHub.Api.Extensions;
using SmartHomeHub.Application.Common.Pagination;
using SmartHomeHub.Application.Features.Scenes.Commands.ActivateScene;
using SmartHomeHub.Application.Features.Scenes.Commands.CreateScene;
using SmartHomeHub.Application.Features.Scenes.Commands.DeleteScene;
using SmartHomeHub.Application.Features.Scenes.Commands.UpdateScene;
using SmartHomeHub.Application.Features.Scenes.Common;
using SmartHomeHub.Application.Features.Scenes.Queries.GetSceneById;
using SmartHomeHub.Application.Features.Scenes.Queries.GetSceneRooms;
using SmartHomeHub.Application.Features.Scenes.Queries.GetScenes;
using SmartHomeHub.Application.Features.Scenes.Queries.GetSceneStats;

namespace SmartHomeHub.Api.Endpoints;

public static class SceneEndpoints
{
    public static void MapSceneEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet(
                "/api/scenes",
                async (
                    ClaimsPrincipal userToken,
                    IMediator mediator,
                    CancellationToken cancellationToken,
                    int page = 1,
                    int pageSize = 10,
                    string? search = null,
                    string? room = null
                ) =>
                {
                    var firebaseUid = userToken.GetFirebaseUid();

                    if (string.IsNullOrEmpty(firebaseUid))
                        return Results.Unauthorized();

                    var scenes = await mediator.Send(
                        new GetScenesQuery(firebaseUid, page, pageSize, search, room),
                        cancellationToken
                    );

                    return Results.Ok(scenes);
                }
            )
            .RequireAuthorization()
            .WithTags("Scenes")
            .WithSummary("Lista as cenas do usuário")
            .WithDescription(
                "Retorna as cenas do usuário autenticado, ordenadas por nome, com o estado desejado de cada dispositivo. `search` filtra pelo nome da cena ou de qualquer dispositivo dela (sem distinguir caixa nem acento) e `room` pelo nome do ambiente de algum dispositivo (`Sem cômodo` para dispositivo sem ambiente); a paginação vale sobre o resultado filtrado."
            )
            .Produces<PagedResult<SceneDto>>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status401Unauthorized);

        app.MapGet(
                "/api/scenes/rooms",
                async (
                    ClaimsPrincipal userToken,
                    IMediator mediator,
                    CancellationToken cancellationToken
                ) =>
                {
                    var firebaseUid = userToken.GetFirebaseUid();

                    if (string.IsNullOrEmpty(firebaseUid))
                        return Results.Unauthorized();

                    var rooms = await mediator.Send(
                        new GetSceneRoomsQuery(firebaseUid),
                        cancellationToken
                    );

                    return Results.Ok(rooms);
                }
            )
            .RequireAuthorization()
            .WithTags("Scenes")
            .WithSummary("Lista os ambientes das cenas")
            .WithDescription(
                "Retorna, em ordem alfabética, os ambientes que aparecem em alguma cena do usuário (`Sem cômodo` para dispositivo fora de ambiente). Serve ao filtro por ambiente da lista, independente da página."
            )
            .Produces<List<string>>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status401Unauthorized);

        app.MapGet(
                "/api/scenes/stats",
                async (
                    ClaimsPrincipal userToken,
                    IMediator mediator,
                    CancellationToken cancellationToken,
                    string? timeZone = null
                ) =>
                {
                    var firebaseUid = userToken.GetFirebaseUid();

                    if (string.IsNullOrEmpty(firebaseUid))
                        return Results.Unauthorized();

                    var result = await mediator.Send(
                        new GetSceneStatsQuery(firebaseUid, timeZone),
                        cancellationToken
                    );

                    return result.IsFailure ? result.ToProblemDetails() : Results.Ok(result.Value);
                }
            )
            .RequireAuthorization()
            .WithTags("Scenes")
            .WithSummary("Estatísticas das ativações de cena")
            .WithDescription(
                "Retorna as ativações de cena dos últimos 7 dias (por dia, total e variação sobre a semana anterior), a taxa de sucesso (ativações sem falha nem dispositivo offline), as 3 cenas mais ativadas, o horário de pico e a última ativação com problema. `timeZone` é um identificador IANA (ex.: `America/Sao_Paulo`) e define a virada do dia e a hora de pico; sem ele vale UTC."
            )
            .Produces<SceneStatsDto>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status401Unauthorized);

        app.MapGet(
                "/api/scenes/{id:guid}",
                async (
                    Guid id,
                    ClaimsPrincipal userToken,
                    IMediator mediator,
                    CancellationToken cancellationToken
                ) =>
                {
                    var firebaseUid = userToken.GetFirebaseUid();

                    if (string.IsNullOrEmpty(firebaseUid))
                        return Results.Unauthorized();

                    var result = await mediator.Send(
                        new GetSceneByIdQuery(id, firebaseUid),
                        cancellationToken
                    );

                    return result.IsFailure ? result.ToProblemDetails() : Results.Ok(result.Value);
                }
            )
            .RequireAuthorization()
            .WithTags("Scenes")
            .WithSummary("Detalha uma cena")
            .Produces<SceneDto>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status404NotFound);

        app.MapPost(
                "/api/scenes",
                async (
                    SaveSceneRequest request,
                    ClaimsPrincipal userToken,
                    IMediator mediator,
                    CancellationToken cancellationToken
                ) =>
                {
                    var firebaseUid = userToken.GetFirebaseUid();

                    if (string.IsNullOrEmpty(firebaseUid))
                        return Results.Unauthorized();

                    var result = await mediator.Send(
                        new CreateSceneCommand(
                            request.Name,
                            request.Icon,
                            request.Items,
                            firebaseUid
                        ),
                        cancellationToken
                    );

                    if (result.IsFailure)
                        return result.ToProblemDetails();

                    return Results.Created(
                        $"/api/scenes/{result.Value}",
                        new SceneCreatedResponseDto("Cena criada com sucesso!", result.Value)
                    );
                }
            )
            .RequireAuthorization()
            .WithTags("Scenes")
            .WithSummary("Cria uma cena")
            .WithDescription(
                "Cria uma cena com o estado desejado de cada dispositivo. Sensores, câmeras, fechaduras e alarmes são rejeitados com **422**; dispositivo de outro usuário é rejeitado com **400**."
            )
            .Produces<SceneCreatedResponseDto>(StatusCodes.Status201Created)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status422UnprocessableEntity);

        app.MapPut(
                "/api/scenes/{id:guid}",
                async (
                    Guid id,
                    SaveSceneRequest request,
                    ClaimsPrincipal userToken,
                    IMediator mediator,
                    CancellationToken cancellationToken
                ) =>
                {
                    var firebaseUid = userToken.GetFirebaseUid();

                    if (string.IsNullOrEmpty(firebaseUid))
                        return Results.Unauthorized();

                    var result = await mediator.Send(
                        new UpdateSceneCommand(
                            id,
                            request.Name,
                            request.Icon,
                            request.Items,
                            firebaseUid
                        ),
                        cancellationToken
                    );

                    return result.IsFailure ? result.ToProblemDetails() : Results.NoContent();
                }
            )
            .RequireAuthorization()
            .WithTags("Scenes")
            .WithSummary("Atualiza uma cena")
            .WithDescription(
                "Substitui nome, ícone e itens da cena. Itens que não estiverem na lista são removidos."
            )
            .Produces(StatusCodes.Status204NoContent)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status422UnprocessableEntity);

        app.MapDelete(
                "/api/scenes/{id:guid}",
                async (
                    Guid id,
                    ClaimsPrincipal userToken,
                    IMediator mediator,
                    CancellationToken cancellationToken
                ) =>
                {
                    var firebaseUid = userToken.GetFirebaseUid();

                    if (string.IsNullOrEmpty(firebaseUid))
                        return Results.Unauthorized();

                    var result = await mediator.Send(
                        new DeleteSceneCommand(id, firebaseUid),
                        cancellationToken
                    );

                    return result.IsFailure ? result.ToProblemDetails() : Results.NoContent();
                }
            )
            .RequireAuthorization()
            .WithTags("Scenes")
            .WithSummary("Apaga uma cena (Soft Delete)")
            .WithDescription(
                "Apaga a cena de forma lógica. Os dispositivos referenciados não são afetados."
            )
            .Produces(StatusCodes.Status204NoContent)
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status404NotFound);

        app.MapPost(
                "/api/scenes/{id:guid}/activate",
                async (
                    Guid id,
                    ClaimsPrincipal userToken,
                    IMediator mediator,
                    CancellationToken cancellationToken
                ) =>
                {
                    var firebaseUid = userToken.GetFirebaseUid();

                    if (string.IsNullOrEmpty(firebaseUid))
                        return Results.Unauthorized();

                    var result = await mediator.Send(
                        new ActivateSceneCommand(id, firebaseUid),
                        cancellationToken
                    );

                    return result.IsFailure ? result.ToProblemDetails() : Results.Ok(result.Value);
                }
            )
            .RequireAuthorization()
            .RequireRateLimiting("DeviceMutationRateLimit")
            .WithTags("Scenes")
            .WithSummary("Ativa uma cena")
            .WithDescription(
                "Aplica o estado desejado de cada dispositivo da cena. Não é transacional: dispositivo offline é pulado (`Skipped`) e falha em um dispositivo (`Failed`) não impede os demais. Responde **200** com o desfecho por dispositivo; o estado confirmado chega pelos eventos SignalR."
            )
            .Produces<SceneActivationResultDto>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status422UnprocessableEntity)
            .ProducesProblem(StatusCodes.Status429TooManyRequests);
    }
}

public record SaveSceneRequest(string Name, string? Icon, List<SceneItemInput> Items);
