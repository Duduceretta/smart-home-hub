using System.Security.Claims;
using Mediator;
using SmartHomeHub.Api.Extensions;
using SmartHomeHub.Application.Common.Pagination;
using SmartHomeHub.Application.Features.History.Queries.GetEventHistory;
using SmartHomeHub.Application.Features.History.Queries.GetEventHistoryStats;
using SmartHomeHub.Domain.Enums;

namespace SmartHomeHub.Api.Endpoints;

public static class HistoryEndpoints
{
    public static void MapHistoryEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet(
                "/api/history",
                async (
                    ClaimsPrincipal userToken,
                    IMediator mediator,
                    CancellationToken cancellationToken,
                    DateTimeOffset startDateUtc,
                    DateTimeOffset endDateUtc,
                    Guid? deviceId = null,
                    Guid? roomId = null,
                    Guid? deviceGroupId = null,
                    EventSeverity? severity = null,
                    EventSource? source = null,
                    string? search = null,
                    int page = 1,
                    int pageSize = 10
                ) =>
                {
                    var firebaseUid = userToken.FindFirst("user_id")?.Value;

                    if (string.IsNullOrEmpty(firebaseUid))
                        return Results.Unauthorized();

                    var query = new GetEventHistoryQuery(
                        firebaseUid,
                        startDateUtc,
                        endDateUtc,
                        deviceId,
                        roomId,
                        deviceGroupId,
                        severity,
                        source,
                        search,
                        page,
                        pageSize
                    );
                    var result = await mediator.Send(query, cancellationToken);

                    return result.IsFailure ? result.ToProblemDetails() : Results.Ok(result.Value);
                }
            )
            .RequireAuthorization()
            .WithTags("History")
            .WithSummary("Lista o Histórico e Auditoria de Eventos")
            .WithDescription(
                "Retorna, paginado e do mais recente para o mais antigo, os eventos persistidos em SystemEvents dentro do intervalo de datas informado, com filtros opcionais por dispositivo, ambiente, grupo de dispositivos, severidade e origem."
            )
            .Produces<PagedResult<EventHistoryDto>>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status401Unauthorized);

        app.MapGet(
                "/api/history/stats",
                async (
                    ClaimsPrincipal userToken,
                    IMediator mediator,
                    CancellationToken cancellationToken,
                    DateTimeOffset startDateUtc,
                    DateTimeOffset endDateUtc,
                    Guid? deviceId = null,
                    Guid? roomId = null,
                    Guid? deviceGroupId = null,
                    EventSeverity? severity = null,
                    EventSource? source = null,
                    string? search = null
                ) =>
                {
                    var firebaseUid = userToken.FindFirst("user_id")?.Value;

                    if (string.IsNullOrEmpty(firebaseUid))
                        return Results.Unauthorized();

                    var query = new GetEventHistoryStatsQuery(
                        firebaseUid,
                        startDateUtc,
                        endDateUtc,
                        deviceId,
                        roomId,
                        deviceGroupId,
                        severity,
                        source,
                        search
                    );
                    var result = await mediator.Send(query, cancellationToken);

                    return result.IsFailure ? result.ToProblemDetails() : Results.Ok(result.Value);
                }
            )
            .RequireAuthorization()
            .WithTags("History")
            .WithSummary("Estatísticas agregadas do Histórico de Eventos")
            .WithDescription(
                "Retorna as contagens agregadas (total, automações, alertas e ações de grupo) dos eventos persistidos em SystemEvents dentro do intervalo de datas informado, aplicando os mesmos filtros de GET /api/history, mas sem paginação."
            )
            .Produces<EventHistoryStatsDto>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status401Unauthorized);
    }
}
