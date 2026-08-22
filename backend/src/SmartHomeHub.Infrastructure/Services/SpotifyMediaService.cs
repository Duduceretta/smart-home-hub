using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Application.Features.Devices.Common;
using SmartHomeHub.Domain.Common.Exceptions;
using SmartHomeHub.Domain.Entities;

namespace SmartHomeHub.Infrastructure.Services;

public class SpotifyMediaService : ISpotifyMediaService
{
    private const string AuthorizeUrl = "https://accounts.spotify.com/authorize";
    private const string TokenUrl = "https://accounts.spotify.com/api/token";
    private const string ApiBaseUrl = "https://api.spotify.com/v1";
    private const string Scopes =
        "user-read-playback-state user-modify-playback-state user-read-currently-playing";

    private readonly HttpClient _httpClient;
    private readonly IAppDbContext _dbContext;
    private readonly ISpotifyTokenCipher _tokenCipher;
    private readonly ILogger<SpotifyMediaService> _logger;
    private readonly string _clientId;
    private readonly string _clientSecret;
    private readonly string _redirectUri;

    private record TokenResponse(
        string AccessToken,
        string? RefreshToken,
        int ExpiresIn
    );

    public SpotifyMediaService(
        HttpClient httpClient,
        IAppDbContext dbContext,
        ISpotifyTokenCipher tokenCipher,
        IConfiguration configuration,
        ILogger<SpotifyMediaService> logger
    )
    {
        _httpClient = httpClient;
        _dbContext = dbContext;
        _tokenCipher = tokenCipher;
        _logger = logger;
        _clientId = configuration["Spotify:ClientId"] ?? string.Empty;
        _clientSecret = configuration["Spotify:ClientSecret"] ?? string.Empty;
        _redirectUri = configuration["Spotify:RedirectUri"] ?? string.Empty;
    }

    public string BuildAuthorizeUrl(string state)
    {
        var query =
            $"client_id={Uri.EscapeDataString(_clientId)}"
            + "&response_type=code"
            + $"&redirect_uri={Uri.EscapeDataString(_redirectUri)}"
            + $"&scope={Uri.EscapeDataString(Scopes)}"
            + $"&state={Uri.EscapeDataString(state)}";

        return $"{AuthorizeUrl}?{query}";
    }

    public async Task ExchangeCodeForTokensAsync(
        string firebaseUid,
        string code,
        CancellationToken cancellationToken = default
    )
    {
        var tokens = await RequestTokenAsync(
            new Dictionary<string, string>
            {
                ["grant_type"] = "authorization_code",
                ["code"] = code,
                ["redirect_uri"] = _redirectUri,
            },
            cancellationToken
        );

        var displayName = await FetchDisplayNameAsync(tokens.AccessToken, cancellationToken);

        var user = await _dbContext.Users.FirstOrDefaultAsync(
            u => u.ExternalAuthUid == firebaseUid,
            cancellationToken
        );

        if (user is null)
        {
            return;
        }

        var integration = await _dbContext.SpotifyIntegrations.FirstOrDefaultAsync(
            x => x.UserId == user.Id,
            cancellationToken
        );

        if (integration is null)
        {
            integration = new SpotifyIntegration { UserId = user.Id };
            _dbContext.SpotifyIntegrations.Add(integration);
        }

        integration.AccessTokenEncrypted = _tokenCipher.Encrypt(tokens.AccessToken);
        if (tokens.RefreshToken is not null)
        {
            integration.RefreshTokenEncrypted = _tokenCipher.Encrypt(tokens.RefreshToken);
        }
        integration.ExpiresAtUtc = DateTimeOffset.UtcNow.AddSeconds(tokens.ExpiresIn);
        integration.SpotifyDisplayName = displayName ?? "Conta Spotify";

        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task<DeviceMediaStateDto?> GetCurrentPlaybackAsync(
        string firebaseUid,
        CancellationToken cancellationToken = default
    )
    {
        try
        {
            var integration = await GetIntegrationAsync(firebaseUid, cancellationToken);
            if (integration is null)
            {
                return null;
            }

            var accessToken = await EnsureValidAccessTokenAsync(integration, cancellationToken);

            using var request = new HttpRequestMessage(HttpMethod.Get, $"{ApiBaseUrl}/me/player");
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

            using var response = await _httpClient.SendAsync(request, cancellationToken);

            if (response.StatusCode == HttpStatusCode.NoContent)
            {
                return null;
            }

            if (!response.IsSuccessStatusCode)
            {
                return null;
            }

            var json = await response.Content.ReadAsStringAsync(cancellationToken);
            return ParsePlaybackResponse(json);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Falha ao consultar o playback do Spotify para {FirebaseUid}", firebaseUid);
            return null;
        }
    }

    public async Task SetVolumeAsync(
        string firebaseUid,
        int volumePercent,
        CancellationToken cancellationToken = default
    )
    {
        var integration = await GetIntegrationAsync(firebaseUid, cancellationToken);
        if (integration is null)
        {
            throw new SpotifyNotConnectedException();
        }

        var accessToken = await EnsureValidAccessTokenAsync(integration, cancellationToken);
        var clampedVolume = Math.Clamp(volumePercent, 0, 100);

        using var request = new HttpRequestMessage(
            HttpMethod.Put,
            $"{ApiBaseUrl}/me/player/volume?volume_percent={clampedVolume}"
        );
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

        using var response = await _httpClient.SendAsync(request, cancellationToken);

        // Spotify retorna 204 No Content em sucesso; 404 = nenhum dispositivo ativo.
        if (!response.IsSuccessStatusCode)
        {
            throw new SpotifyPlaybackUnavailableException();
        }
    }

    public async Task TogglePlayPauseAsync(
        string firebaseUid,
        CancellationToken cancellationToken = default
    )
    {
        var integration = await GetIntegrationAsync(firebaseUid, cancellationToken);
        if (integration is null)
        {
            throw new SpotifyNotConnectedException();
        }

        var accessToken = await EnsureValidAccessTokenAsync(integration, cancellationToken);

        using var stateRequest = new HttpRequestMessage(HttpMethod.Get, $"{ApiBaseUrl}/me/player");
        stateRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
        using var stateResponse = await _httpClient.SendAsync(stateRequest, cancellationToken);

        if (stateResponse.StatusCode == HttpStatusCode.NoContent)
        {
            throw new SpotifyPlaybackUnavailableException();
        }

        var isPlaying = false;
        if (stateResponse.IsSuccessStatusCode)
        {
            var json = await stateResponse.Content.ReadAsStringAsync(cancellationToken);
            isPlaying = ParsePlaybackResponse(json)?.IsPlaying ?? false;
        }

        var action = isPlaying ? "pause" : "play";
        using var actionRequest = new HttpRequestMessage(
            HttpMethod.Put,
            $"{ApiBaseUrl}/me/player/{action}"
        );
        actionRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

        using var actionResponse = await _httpClient.SendAsync(actionRequest, cancellationToken);

        if (!actionResponse.IsSuccessStatusCode)
        {
            throw new SpotifyPlaybackUnavailableException();
        }
    }

    public async Task SkipToNextAsync(
        string firebaseUid,
        CancellationToken cancellationToken = default
    )
    {
        await SendPlayerCommandAsync(firebaseUid, HttpMethod.Post, "next", cancellationToken);
    }

    public async Task SkipToPreviousAsync(
        string firebaseUid,
        CancellationToken cancellationToken = default
    )
    {
        await SendPlayerCommandAsync(firebaseUid, HttpMethod.Post, "previous", cancellationToken);
    }

    private async Task SendPlayerCommandAsync(
        string firebaseUid,
        HttpMethod method,
        string action,
        CancellationToken cancellationToken
    )
    {
        var integration = await GetIntegrationAsync(firebaseUid, cancellationToken);
        if (integration is null)
        {
            throw new SpotifyNotConnectedException();
        }

        var accessToken = await EnsureValidAccessTokenAsync(integration, cancellationToken);

        using var request = new HttpRequestMessage(method, $"{ApiBaseUrl}/me/player/{action}");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

        using var response = await _httpClient.SendAsync(request, cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            throw new SpotifyPlaybackUnavailableException();
        }
    }

    private async Task<SpotifyIntegration?> GetIntegrationAsync(
        string firebaseUid,
        CancellationToken cancellationToken
    )
    {
        return await _dbContext
            .SpotifyIntegrations.Include(x => x.User)
            .FirstOrDefaultAsync(x => x.User.ExternalAuthUid == firebaseUid, cancellationToken);
    }

    private async Task<string> EnsureValidAccessTokenAsync(
        SpotifyIntegration integration,
        CancellationToken cancellationToken
    )
    {
        if (integration.ExpiresAtUtc > DateTimeOffset.UtcNow.AddMinutes(1))
        {
            return _tokenCipher.Decrypt(integration.AccessTokenEncrypted);
        }

        var refreshToken = _tokenCipher.Decrypt(integration.RefreshTokenEncrypted);

        var tokens = await RequestTokenAsync(
            new Dictionary<string, string>
            {
                ["grant_type"] = "refresh_token",
                ["refresh_token"] = refreshToken,
            },
            cancellationToken
        );

        integration.AccessTokenEncrypted = _tokenCipher.Encrypt(tokens.AccessToken);
        if (tokens.RefreshToken is not null)
        {
            integration.RefreshTokenEncrypted = _tokenCipher.Encrypt(tokens.RefreshToken);
        }
        integration.ExpiresAtUtc = DateTimeOffset.UtcNow.AddSeconds(tokens.ExpiresIn);

        await _dbContext.SaveChangesAsync(cancellationToken);

        return tokens.AccessToken;
    }

    private async Task<TokenResponse> RequestTokenAsync(
        Dictionary<string, string> formData,
        CancellationToken cancellationToken
    )
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, TokenUrl)
        {
            Content = new FormUrlEncodedContent(formData),
        };

        var basicAuth = Convert.ToBase64String(
            System.Text.Encoding.UTF8.GetBytes($"{_clientId}:{_clientSecret}")
        );
        request.Headers.Authorization = new AuthenticationHeaderValue("Basic", basicAuth);

        using var response = await _httpClient.SendAsync(request, cancellationToken);
        response.EnsureSuccessStatusCode();

        var json = await response.Content.ReadAsStringAsync(cancellationToken);
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        var accessToken = root.GetProperty("access_token").GetString()!;
        var expiresIn = root.GetProperty("expires_in").GetInt32();
        var refreshToken = root.TryGetProperty("refresh_token", out var refreshEl)
            ? refreshEl.GetString()
            : null;

        return new TokenResponse(accessToken, refreshToken, expiresIn);
    }

    private async Task<string?> FetchDisplayNameAsync(
        string accessToken,
        CancellationToken cancellationToken
    )
    {
        try
        {
            using var request = new HttpRequestMessage(HttpMethod.Get, $"{ApiBaseUrl}/me");
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

            using var response = await _httpClient.SendAsync(request, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                return null;
            }

            var json = await response.Content.ReadAsStringAsync(cancellationToken);
            using var doc = JsonDocument.Parse(json);
            return doc.RootElement.TryGetProperty("display_name", out var nameEl)
                ? nameEl.GetString()
                : null;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Falha ao buscar o nome de exibição da conta Spotify");
            return null;
        }
    }

    public static DeviceMediaStateDto? ParsePlaybackResponse(string? json)
    {
        if (string.IsNullOrWhiteSpace(json))
        {
            return null;
        }

        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        var isPlaying = root.TryGetProperty("is_playing", out var isPlayingEl) && isPlayingEl.GetBoolean();

        string? title = null;
        string? artist = null;
        string? albumCoverUrl = null;

        if (root.TryGetProperty("item", out var itemEl) && itemEl.ValueKind == JsonValueKind.Object)
        {
            if (itemEl.TryGetProperty("name", out var nameEl))
            {
                title = nameEl.GetString();
            }

            if (
                itemEl.TryGetProperty("artists", out var artistsEl)
                && artistsEl.ValueKind == JsonValueKind.Array
            )
            {
                var names = artistsEl
                    .EnumerateArray()
                    .Select(a => a.TryGetProperty("name", out var n) ? n.GetString() : null)
                    .Where(n => !string.IsNullOrWhiteSpace(n));
                artist = string.Join(", ", names);
            }

            if (
                itemEl.TryGetProperty("album", out var albumEl)
                && albumEl.TryGetProperty("images", out var imagesEl)
                && imagesEl.ValueKind == JsonValueKind.Array
                && imagesEl.GetArrayLength() > 0
            )
            {
                albumCoverUrl = imagesEl[0].TryGetProperty("url", out var urlEl)
                    ? urlEl.GetString()
                    : null;
            }
        }

        var volumePercent = 0;
        string? deviceName = null;

        if (root.TryGetProperty("device", out var deviceEl) && deviceEl.ValueKind == JsonValueKind.Object)
        {
            if (
                deviceEl.TryGetProperty("volume_percent", out var volEl)
                && volEl.ValueKind == JsonValueKind.Number
            )
            {
                volumePercent = volEl.GetInt32();
            }

            if (deviceEl.TryGetProperty("name", out var devNameEl))
            {
                deviceName = devNameEl.GetString();
            }
        }

        return new DeviceMediaStateDto(
            volumePercent,
            isPlaying,
            title,
            string.IsNullOrWhiteSpace(artist) ? null : artist,
            albumCoverUrl,
            deviceName
        );
    }
}
