using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.RegularExpressions;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using NSubstitute;
using NSubstitute.ClearExtensions;
using NSubstitute.ExceptionExtensions;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Domain.Common.Exceptions;
using SmartHomeHub.Domain.Entities;
using SmartHomeHub.IntegrationTests.Setup;
using Xunit;

namespace SmartHomeHub.IntegrationTests.Features.Integrations;

public partial class SpotifyIntegrationEndpointsTests(IntegrationTestWebAppFactory factory)
    : BaseIntegrationTest(factory)
{
    private readonly ISpotifyMediaService _spotifyMediaService =
        factory.Services.GetRequiredService<ISpotifyMediaService>();

    private void Reset() => _spotifyMediaService.ClearSubstitute();

    private async Task<User> SeedUserAsync()
    {
        var user = new User
        {
            Name = "Eduardo",
            Email = "eduardo@smarthome.com",
            ExternalAuthUid = "firebase-token-123",
        };
        DbContext.Users.Add(user);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);
        return user;
    }

    [GeneratedRegex(@"state=([^&]+)")]
    private static partial Regex StateParamRegex();

    [Fact]
    public async Task SpotifyLogin_WhenAuthenticated_ShouldReturnAuthorizeUrlWithState()
    {
        Reset();
        await SeedUserAsync();

        _spotifyMediaService
            .BuildAuthorizeUrl(Arg.Any<string>())
            .Returns(callInfo => $"https://accounts.spotify.com/authorize?state={callInfo.Arg<string>()}");

        var response = await Client.GetAsync(
            "/api/integrations/spotify/login",
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>(
            cancellationToken: TestContext.Current.CancellationToken
        );
        var authorizeUrl = body.GetProperty("authorizeUrl").GetString();

        authorizeUrl.Should().NotBeNullOrEmpty();
        StateParamRegex().IsMatch(authorizeUrl!).Should().BeTrue();
    }

    [Fact]
    public async Task SpotifyCallback_WithValidState_ShouldRedirectToFrontendConnected()
    {
        Reset();
        await SeedUserAsync();

        _spotifyMediaService
            .BuildAuthorizeUrl(Arg.Any<string>())
            .Returns(callInfo => $"https://accounts.spotify.com/authorize?state={callInfo.Arg<string>()}");

        var loginResponse = await Client.GetAsync(
            "/api/integrations/spotify/login",
            TestContext.Current.CancellationToken
        );
        var loginBody = await loginResponse.Content.ReadFromJsonAsync<JsonElement>(
            cancellationToken: TestContext.Current.CancellationToken
        );
        var state = StateParamRegex().Match(loginBody.GetProperty("authorizeUrl").GetString()!).Groups[1].Value;

        var response = await Client.GetAsync(
            $"/api/integrations/spotify/callback?code=fake-code&state={state}",
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.Found);
        response.Headers.Location!.ToString().Should().Contain("spotify=connected");

        await _spotifyMediaService
            .Received(1)
            .ExchangeCodeForTokensAsync(
                "firebase-token-123",
                "fake-code",
                Arg.Any<CancellationToken>()
            );
    }

    [Fact]
    public async Task SpotifyCallback_WithInvalidState_ShouldRedirectToFrontendError()
    {
        Reset();

        var response = await Client.GetAsync(
            "/api/integrations/spotify/callback?code=fake-code&state=nonexistent-state",
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.Found);
        response.Headers.Location!.ToString().Should().Contain("spotify=error");

        await _spotifyMediaService
            .DidNotReceive()
            .ExchangeCodeForTokensAsync(
                Arg.Any<string>(),
                Arg.Any<string>(),
                Arg.Any<CancellationToken>()
            );
    }

    [Fact]
    public async Task SpotifyStatus_WhenIntegrationExists_ShouldReturnConnectedTrue()
    {
        Reset();
        var user = await SeedUserAsync();

        DbContext.SpotifyIntegrations.Add(
            new SpotifyIntegration
            {
                UserId = user.Id,
                AccessTokenEncrypted = "enc-access",
                RefreshTokenEncrypted = "enc-refresh",
                ExpiresAtUtc = DateTimeOffset.UtcNow.AddHours(1),
                SpotifyDisplayName = "Eduardo Ceretta",
            }
        );
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        var response = await Client.GetAsync(
            "/api/integrations/spotify/status",
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>(
            cancellationToken: TestContext.Current.CancellationToken
        );
        body.GetProperty("connected").GetBoolean().Should().BeTrue();
        body.GetProperty("displayName").GetString().Should().Be("Eduardo Ceretta");
    }

    [Fact]
    public async Task SpotifyStatus_WhenNoIntegration_ShouldReturnConnectedFalse()
    {
        Reset();
        await SeedUserAsync();

        var response = await Client.GetAsync(
            "/api/integrations/spotify/status",
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>(
            cancellationToken: TestContext.Current.CancellationToken
        );
        body.GetProperty("connected").GetBoolean().Should().BeFalse();
    }

    [Fact]
    public async Task DisconnectSpotify_ShouldRemoveIntegrationRow()
    {
        Reset();
        var user = await SeedUserAsync();

        DbContext.SpotifyIntegrations.Add(
            new SpotifyIntegration
            {
                UserId = user.Id,
                AccessTokenEncrypted = "enc-access",
                RefreshTokenEncrypted = "enc-refresh",
                ExpiresAtUtc = DateTimeOffset.UtcNow.AddHours(1),
                SpotifyDisplayName = "Eduardo Ceretta",
            }
        );
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        var response = await Client.DeleteAsync(
            "/api/integrations/spotify",
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.NoContent);

        var remaining = await DbContext
            .SpotifyIntegrations.AsNoTracking()
            .AnyAsync(x => x.UserId == user.Id, TestContext.Current.CancellationToken);
        remaining.Should().BeFalse();
    }

    [Theory]
    [InlineData(-1)]
    [InlineData(101)]
    public async Task SetSpotifyVolume_OutOfRange_ShouldReturn400(int volume)
    {
        Reset();
        await SeedUserAsync();

        var response = await Client.PutAsJsonAsync(
            "/api/integrations/spotify/volume",
            new { volume },
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task SetSpotifyVolume_WhenNotConnected_ShouldReturn400WithSemanticCode()
    {
        Reset();
        await SeedUserAsync();

        _spotifyMediaService
            .SetVolumeAsync(Arg.Any<string>(), Arg.Any<int>(), Arg.Any<CancellationToken>())
            .ThrowsAsync(new SpotifyNotConnectedException());

        var response = await Client.PutAsJsonAsync(
            "/api/integrations/spotify/volume",
            new { volume = 50 },
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>(
            cancellationToken: TestContext.Current.CancellationToken
        );
        body.GetProperty("title").GetString().Should().Be("Spotify.NotConnected");
    }
}
