using System.Collections.Concurrent;
using SmartHomeHub.Application.Common.Interfaces;

namespace SmartHomeHub.IntegrationTests.Setup;

// Substitui o provedor de clima real (chamada HTTP externa ao Open-Meteo) nos
// testes de integração: leitura configurável por coordenada arredondada, sem
// nunca fazer chamada de rede de verdade, mesmo princípio de TestDeviceProbeService.
public sealed class TestWeatherProvider : IWeatherProvider
{
    private readonly ConcurrentDictionary<(double, double), WeatherReading> _results = new();
    private int _callCount;

    public int CallCount => _callCount;

    public void SetResult(double latitude, double longitude, WeatherReading reading) =>
        _results[(latitude, longitude)] = reading;

    public void Reset()
    {
        _results.Clear();
        Interlocked.Exchange(ref _callCount, 0);
    }

    public Task<WeatherReading?> GetCurrentWeatherAsync(
        double latitude,
        double longitude,
        CancellationToken cancellationToken
    )
    {
        Interlocked.Increment(ref _callCount);
        _results.TryGetValue((latitude, longitude), out var reading);
        return Task.FromResult(reading);
    }
}
