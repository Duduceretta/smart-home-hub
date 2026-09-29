using System.Security.Claims;
using Mediator;
using SmartHomeHub.Api.Extensions;
using SmartHomeHub.Application.Features.Weather.Queries.GetCurrentWeather;

namespace SmartHomeHub.Api.Endpoints;

public static class WeatherEndpoints
{
    public static void MapWeatherEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet(
                "/api/weather/current",
                async (ClaimsPrincipal userToken, IMediator mediator, CancellationToken cancellationToken) =>
                {
                    var firebaseUid = userToken.GetFirebaseUid();

                    if (string.IsNullOrEmpty(firebaseUid))
                        return Results.Unauthorized();

                    var query = new GetCurrentWeatherQuery(firebaseUid);
                    var result = await mediator.Send(query, cancellationToken);

                    return Results.Ok(result);
                }
            )
            .RequireAuthorization()
            .WithTags("Weather")
            .WithSummary("Busca o clima real da localização salva do usuário")
            .WithDescription(
                "Lê Latitude/Longitude salvos no usuário e retorna o clima atual (Open-Meteo, cacheado 20min por localização arredondada). `hasLocation=false` = usuário nunca configurou localização; `hasLocation=true, weather=null` = localização configurada mas o provedor externo falhou agora — estados diferentes, nunca confundidos."
            )
            .Produces<CurrentWeatherResponse>(StatusCodes.Status200OK);
    }
}
