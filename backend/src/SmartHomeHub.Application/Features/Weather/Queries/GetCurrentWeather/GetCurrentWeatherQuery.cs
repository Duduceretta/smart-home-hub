using Mediator;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using SmartHomeHub.Application.Common.Interfaces;

namespace SmartHomeHub.Application.Features.Weather.Queries.GetCurrentWeather;

public record CurrentWeatherDto(
    double TemperatureCelsius,
    double FeelsLikeCelsius,
    double HumidityPercent,
    double WindSpeedKmh,
    string Condition
);

/// <summary>
/// <c>HasLocation=false</c> → usuário nunca configurou localização (frontend
/// mostra CTA de ativar). <c>HasLocation=true, Weather=null</c> → localização
/// configurada mas o provedor externo falhou agora (frontend esconde a
/// cápsula de clima, não é a mesma situação — nunca confundir as duas).
/// </summary>
public record CurrentWeatherResponse(bool HasLocation, CurrentWeatherDto? Weather);

public record GetCurrentWeatherQuery(string FirebaseUid) : IQuery<CurrentWeatherResponse>;

/// <summary>
/// Lê o clima real pela localização salva do usuário (ver <see cref="User"/>.Latitude/Longitude).
/// Cache por coordenada arredondada a 2 casas decimais (~1,1km) — não por
/// usuário — pra usuários próximos compartilharem a mesma chamada ao
/// provedor externo, mesmo padrão documentado pela The Weather Company pra
/// escalar API de clima. TTL de 20min: clima atual muda pouco nesse
/// intervalo, e evita estourar limite de chamadas do provedor.
/// </summary>
public class GetCurrentWeatherQueryHandler(
    IAppDbContext dbContext,
    IWeatherProvider weatherProvider,
    IMemoryCache cache
) : IQueryHandler<GetCurrentWeatherQuery, CurrentWeatherResponse>
{
    private static readonly TimeSpan CacheTtl = TimeSpan.FromMinutes(20);

    public async ValueTask<CurrentWeatherResponse> Handle(
        GetCurrentWeatherQuery request,
        CancellationToken cancellationToken
    )
    {
        var location = await dbContext
            .Users.AsNoTracking()
            .Where(user => user.ExternalAuthUid == request.FirebaseUid)
            .Select(user => new { user.Latitude, user.Longitude })
            .FirstOrDefaultAsync(cancellationToken);

        if (location?.Latitude is null || location.Longitude is null)
        {
            return new CurrentWeatherResponse(HasLocation: false, Weather: null);
        }

        var roundedLatitude = Math.Round(location.Latitude.Value, 2);
        var roundedLongitude = Math.Round(location.Longitude.Value, 2);
        var cacheKey = $"weather:{roundedLatitude}:{roundedLongitude}";

        // Nunca cacheia uma falha do provedor (null) — um outage transitório
        // não pode prender a Home 20min mostrando "sem clima" quando a
        // próxima chamada já teria dado certo. GetOrCreateAsync cachearia o
        // null também, por isso o controle manual aqui.
        if (!cache.TryGetValue(cacheKey, out WeatherReading? reading))
        {
            reading = await weatherProvider.GetCurrentWeatherAsync(
                roundedLatitude,
                roundedLongitude,
                cancellationToken
            );

            if (reading is not null)
            {
                cache.Set(cacheKey, reading, CacheTtl);
            }
        }

        if (reading is null)
        {
            return new CurrentWeatherResponse(HasLocation: true, Weather: null);
        }

        return new CurrentWeatherResponse(
            HasLocation: true,
            Weather: new CurrentWeatherDto(
                reading.TemperatureCelsius,
                reading.FeelsLikeCelsius,
                reading.HumidityPercent,
                reading.WindSpeedKmh,
                reading.Condition
            )
        );
    }
}
