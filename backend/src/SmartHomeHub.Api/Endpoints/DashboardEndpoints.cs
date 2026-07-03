using System.Security.Claims;
using Mediator;
using SmartHomeHub.Api.Extensions;
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
    }
}
