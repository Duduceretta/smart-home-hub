using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Mediator;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Application.Features.Weather.Queries.GetCurrentWeather;
using SmartHomeHub.Domain.Entities;
using SmartHomeHub.IntegrationTests.Setup;

namespace SmartHomeHub.IntegrationTests.Features.Weather.Queries.GetCurrentWeather;

public class GetCurrentWeatherTests : BaseIntegrationTest
{
    private record WeatherResponse(
        double TemperatureCelsius,
        double FeelsLikeCelsius,
        double HumidityPercent,
        double WindSpeedKmh,
        string Condition
    );

    private record CurrentWeatherResponseDto(bool HasLocation, WeatherResponse? Weather);

    private TestWeatherProvider WeatherProvider =>
        Factory.Services.GetRequiredService<TestWeatherProvider>();

    public GetCurrentWeatherTests(IntegrationTestWebAppFactory factory)
        : base(factory)
    {
        // Nova instância da classe de teste a cada [Fact] (xUnit) — reseta o
        // spy compartilhado (Singleton no DI) pra não vazar CallCount/leituras
        // configuradas de um teste pro outro.
        WeatherProvider.Reset();
    }

    private async Task<User> SeedUserAsync(double? latitude = null, double? longitude = null)
    {
        var user = new User
        {
            Id = Guid.NewGuid(),
            Name = "Eduardo Ceretta",
            Email = "eduardo@smarthome.com",
            ExternalAuthUid = "firebase-token-123",
            Latitude = latitude,
            Longitude = longitude,
        };
        DbContext.Users.Add(user);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);
        return user;
    }

    [Fact]
    public async Task GetCurrentWeather_UserWithoutLocation_ShouldReturnHasLocationFalse_NotAnError()
    {
        await SeedUserAsync();

        var response = await Client.GetAsync(
            "/api/weather/current",
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var result = await response.Content.ReadFromJsonAsync<CurrentWeatherResponseDto>(
            cancellationToken: TestContext.Current.CancellationToken
        );

        result!.HasLocation.Should().BeFalse();
        result.Weather.Should().BeNull();
        WeatherProvider.CallCount.Should().Be(0, "sem coordenada não há o que consultar.");
    }

    [Fact]
    public async Task GetCurrentWeather_UserWithLocation_ShouldReturnRealProviderReading()
    {
        await SeedUserAsync(latitude: -23.55, longitude: -46.63);
        WeatherProvider.SetResult(
            -23.55,
            -46.63,
            new WeatherReading(21.5, 22.0, 58, 14, "Clear")
        );

        var response = await Client.GetAsync(
            "/api/weather/current",
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var result = await response.Content.ReadFromJsonAsync<CurrentWeatherResponseDto>(
            cancellationToken: TestContext.Current.CancellationToken
        );

        result!.HasLocation.Should().BeTrue();
        result.Weather.Should().NotBeNull();
        result.Weather!.TemperatureCelsius.Should().Be(21.5);
        result.Weather.Condition.Should().Be("Clear");
    }

    [Fact]
    public async Task GetCurrentWeather_LocationConfiguredButProviderFails_ShouldReturnHasLocationTrueWithNullWeather()
    {
        // Diferente de "sem localização" — o frontend precisa distinguir
        // "ative a localização" de "clima indisponível agora" (provedor caiu).
        await SeedUserAsync(latitude: -8.05, longitude: -34.90);
        // Nenhum WeatherProvider.SetResult pra essa coordenada = provedor
        // "não encontra" leitura, simulando falha/indisponibilidade.

        var response = await Client.GetAsync(
            "/api/weather/current",
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var result = await response.Content.ReadFromJsonAsync<CurrentWeatherResponseDto>(
            cancellationToken: TestContext.Current.CancellationToken
        );

        result!.HasLocation.Should().BeTrue();
        result.Weather.Should().BeNull();
    }

    [Fact]
    public async Task GetCurrentWeather_SecondCallWithinTtl_ShouldServeFromCache_NotCallProviderAgain()
    {
        // Coordenada só desse teste — IMemoryCache é Singleton pro processo
        // de teste inteiro (não é resetado pelo Respawner entre [Fact]s),
        // então reusar coordenada de outro teste daria falso "cache hit".
        await SeedUserAsync(latitude: -22.90, longitude: -43.20);
        WeatherProvider.SetResult(-22.90, -43.20, new WeatherReading(21.5, 22.0, 58, 14, "Clear"));

        await Client.GetAsync("/api/weather/current", TestContext.Current.CancellationToken);
        await Client.GetAsync("/api/weather/current", TestContext.Current.CancellationToken);

        WeatherProvider.CallCount.Should().Be(1, "a 2ª chamada dentro do TTL deve vir do cache.");
    }

    [Fact]
    public async Task GetCurrentWeather_SameUserMovesWithinSameRoundedGrid_ShouldStillHitCache()
    {
        // Diferença na 3ª casa decimal (~110m) — arredonda pro mesmo grid de
        // 2 casas decimais (~1,1km), mesma chave de cache. Coordenada só
        // desse teste (ver comentário no teste acima sobre cache Singleton).
        var user = await SeedUserAsync(latitude: -15.791, longitude: -47.881);
        WeatherProvider.SetResult(-15.79, -47.88, new WeatherReading(21.5, 22.0, 58, 14, "Clear"));
        await Client.GetAsync("/api/weather/current", TestContext.Current.CancellationToken);

        user.Latitude = -15.789;
        user.Longitude = -47.879;
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        var response = await Client.GetAsync(
            "/api/weather/current",
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        WeatherProvider.CallCount.Should().Be(
            1,
            "coordenadas que arredondam pro mesmo grid reusam a leitura cacheada."
        );
    }

    [Fact]
    public async Task GetCurrentWeather_TwoDifferentUsersInSameRoundedLocation_ShouldShareTheCachedCall()
    {
        // Prova a garantia mais importante do design: o cache é por
        // LOCALIZAÇÃO, nunca por usuário — dois donos diferentes, mesma
        // região, só 1 chamada real ao provedor. TestAuthHandler só
        // autentica um usuário fixo por HTTP, então esse cenário precisa
        // disparar a query direto via Mediator pros dois usuários reais.
        await SeedUserAsync(latitude: -30.031, longitude: -51.231);
        var secondUser = new User
        {
            Id = Guid.NewGuid(),
            Name = "Vizinho",
            Email = "vizinho@smarthome.com",
            ExternalAuthUid = "vizinho-token",
            Latitude = -30.029,
            Longitude = -51.229,
        };
        DbContext.Users.Add(secondUser);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        WeatherProvider.SetResult(-30.03, -51.23, new WeatherReading(21.5, 22.0, 58, 14, "Clear"));

        using var scope = Factory.Services.CreateScope();
        var mediator = scope.ServiceProvider.GetRequiredService<IMediator>();

        await mediator.Send(
            new GetCurrentWeatherQuery("firebase-token-123"),
            TestContext.Current.CancellationToken
        );
        var secondResult = await mediator.Send(
            new GetCurrentWeatherQuery("vizinho-token"),
            TestContext.Current.CancellationToken
        );

        secondResult.Weather.Should().NotBeNull();
        WeatherProvider.CallCount.Should().Be(
            1,
            "dois usuários diferentes na mesma região compartilham a mesma chamada cacheada."
        );
    }

    [Fact]
    public async Task GetCurrentWeather_TwoUsersInDifferentLocations_ShouldCallProviderSeparately()
    {
        await SeedUserAsync(latitude: -12.97, longitude: -38.50);
        WeatherProvider.SetResult(-12.97, -38.50, new WeatherReading(21.5, 22.0, 58, 14, "Clear"));
        await Client.GetAsync("/api/weather/current", TestContext.Current.CancellationToken);

        var user = await DbContext.Users.SingleAsync(
            u => u.ExternalAuthUid == "firebase-token-123",
            TestContext.Current.CancellationToken
        );
        // Nova York — claramente outra região, outro grid de cache.
        user.Latitude = 40.71;
        user.Longitude = -74.01;
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);
        WeatherProvider.SetResult(40.71, -74.01, new WeatherReading(5.0, 2.0, 40, 20, "Clouds"));

        var response = await Client.GetAsync(
            "/api/weather/current",
            TestContext.Current.CancellationToken
        );

        var result = await response.Content.ReadFromJsonAsync<CurrentWeatherResponseDto>(
            cancellationToken: TestContext.Current.CancellationToken
        );

        WeatherProvider.CallCount.Should().Be(2, "localizações diferentes nunca compartilham cache.");
        result!.Weather!.Condition.Should().Be("Clouds");
    }
}
