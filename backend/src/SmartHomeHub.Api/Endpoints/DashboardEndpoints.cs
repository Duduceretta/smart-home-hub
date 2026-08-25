using System.Security.Claims;
using Mediator;
using SmartHomeHub.Api.Extensions;
using SmartHomeHub.Application.Features.Dashboards.Queries.GetActivityLog;
using SmartHomeHub.Application.Features.Dashboards.Queries.GetDashboardOverview;

namespace SmartHomeHub.Api.Endpoints;

public static class DashboardEndpoints
{
    public static void MapDashboardEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet(
                "/api/dashboard/overview",
                async (
                    ClaimsPrincipal userToken,
                    IMediator mediator,
                    CancellationToken cancellationToken,
                    DateTimeOffset? targetDate = null
                ) =>
                {
                    var firebaseUid = userToken.FindFirst("user_id")?.Value;

                    if (string.IsNullOrEmpty(firebaseUid))
                        return Results.Unauthorized();

                    var dateUtc = targetDate ?? DateTimeOffset.UtcNow;

                    var query = new GetDashboardOverviewQuery(firebaseUid, dateUtc);
                    var result = await mediator.Send(query, cancellationToken);

                    if (result.IsFailure)
                        return result.ToProblemDetails();

                    return Results.Ok(result.Value);
                }
            )
            .RequireAuthorization()
            .WithTags("Dashboard")
            .WithSummary("Obtém os dados consolidados para a Dashboard")
            .WithDescription(
                "Retorna os KPIs, gráficos de energia por hora, divisão por cômodo e atividades recentes do usuário logado."
            )
            .Produces<DashboardOverviewResponse>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status401Unauthorized);

        app.MapGet(
                "/api/dashboard/activity-log",
                async (
                    ClaimsPrincipal userToken,
                    IMediator mediator,
                    CancellationToken cancellationToken,
                    int page = 1,
                    int pageSize = 10
                ) =>
                {
                    var firebaseUid = userToken.FindFirst("user_id")?.Value;

                    if (string.IsNullOrEmpty(firebaseUid))
                        return Results.Unauthorized();

                    var query = new GetActivityLogQuery(firebaseUid, page, pageSize);
                    var result = await mediator.Send(query, cancellationToken);

                    return Results.Ok(result);
                }
            )
            .RequireAuthorization()
            .WithTags("Dashboard")
            .WithSummary("Lista o histórico de eventos da Linha do Tempo")
            .WithDescription(
                "Retorna, paginado, os eventos reais persistidos (status de dispositivo, mídia, Spotify) do usuário logado, do mais recente para o mais antigo."
            )
            .Produces<object>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status401Unauthorized);
    }
}
