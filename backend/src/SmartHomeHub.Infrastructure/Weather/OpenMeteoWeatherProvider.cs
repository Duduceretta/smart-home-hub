using System.Globalization;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using SmartHomeHub.Application.Common.Interfaces;

namespace SmartHomeHub.Infrastructure.Weather;

/// <summary>
/// Open-Meteo hoje — free tier não-comercial, sem chave, ~10k chamadas/dia
/// (bem acima do que este hub usa com cache de 20min). Se um dia o produto
/// virar comercial, troca pro Standard Plan pago (mesma API, só muda
/// base URL/chave) — a troca fica contida nesta classe, o resto do sistema
/// nunca sabe qual provedor está por trás de <see cref="IWeatherProvider"/>.
/// </summary>
public class OpenMeteoWeatherProvider(HttpClient httpClient, ILogger<OpenMeteoWeatherProvider> logger)
    : IWeatherProvider
{
    // WMO Weather interpretation codes (usados pelo Open-Meteo) reduzidos
    // pras poucas categorias que a UI hoje diferencia visualmente.
    private static readonly Dictionary<int, string> WeatherCodeToCondition = new()
    {
        [0] = "Clear",
        [1] = "Clear",
        [2] = "Clouds",
        [3] = "Clouds",
        [45] = "Fog",
        [48] = "Fog",
        [51] = "Drizzle",
        [53] = "Drizzle",
        [55] = "Drizzle",
        [61] = "Rain",
        [63] = "Rain",
        [65] = "Rain",
        [71] = "Snow",
        [73] = "Snow",
        [75] = "Snow",
        [80] = "Rain",
        [81] = "Rain",
        [82] = "Rain",
        [95] = "Thunderstorm",
        [96] = "Thunderstorm",
        [99] = "Thunderstorm",
    };

    public async Task<WeatherReading?> GetCurrentWeatherAsync(
        double latitude,
        double longitude,
        CancellationToken cancellationToken
    )
    {
        try
        {
            var url =
                "/v1/forecast"
                + $"?latitude={latitude.ToString(CultureInfo.InvariantCulture)}"
                + $"&longitude={longitude.ToString(CultureInfo.InvariantCulture)}"
                + "&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code";

            using var response = await httpClient.GetAsync(url, cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                logger.LogWarning(
                    "Open-Meteo respondeu {StatusCode} pra ({Latitude}, {Longitude})",
                    response.StatusCode,
                    latitude,
                    longitude
                );
                return null;
            }

            await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
            using var document = await JsonDocument.ParseAsync(stream, cancellationToken: cancellationToken);
            var current = document.RootElement.GetProperty("current");

            var weatherCode = current.GetProperty("weather_code").GetInt32();

            return new WeatherReading(
                TemperatureCelsius: current.GetProperty("temperature_2m").GetDouble(),
                FeelsLikeCelsius: current.GetProperty("apparent_temperature").GetDouble(),
                HumidityPercent: current.GetProperty("relative_humidity_2m").GetDouble(),
                WindSpeedKmh: current.GetProperty("wind_speed_10m").GetDouble(),
                Condition: WeatherCodeToCondition.GetValueOrDefault(weatherCode, "Clouds")
            );
        }
        catch (Exception ex) when (ex is HttpRequestException or JsonException or TaskCanceledException)
        {
            logger.LogWarning(
                ex,
                "Falha ao buscar clima real na Open-Meteo pra ({Latitude}, {Longitude})",
                latitude,
                longitude
            );
            return null;
        }
    }
}
