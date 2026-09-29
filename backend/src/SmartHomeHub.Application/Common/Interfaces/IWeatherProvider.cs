namespace SmartHomeHub.Application.Common.Interfaces;

public record WeatherReading(
    double TemperatureCelsius,
    double FeelsLikeCelsius,
    double HumidityPercent,
    double WindSpeedKmh,
    string Condition
);

/// <summary>
/// Fronteira externa real (hoje Open-Meteo) — trocável sem tocar em
/// <c>Application</c>, mesmo racional de <see cref="IAutomationSchedulerService"/>.
/// Retorna <c>null</c> quando o provedor está fora do ar/erro, nunca lança —
/// quem decide o que fazer com "sem leitura" é o handler.
/// </summary>
public interface IWeatherProvider
{
    Task<WeatherReading?> GetCurrentWeatherAsync(
        double latitude,
        double longitude,
        CancellationToken cancellationToken
    );
}
