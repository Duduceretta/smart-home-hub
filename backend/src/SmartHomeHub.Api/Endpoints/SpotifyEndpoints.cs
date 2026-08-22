using System.Security.Claims;
using Mediator;
using Microsoft.Extensions.Configuration;
using SmartHomeHub.Api.Extensions;
using SmartHomeHub.Application.Features.Integrations.Commands.CompleteSpotifyConnection;
using SmartHomeHub.Application.Features.Integrations.Commands.DisconnectSpotify;
using SmartHomeHub.Application.Features.Integrations.Commands.SetSpotifyVolume;
using SmartHomeHub.Application.Features.Integrations.Commands.SkipToNextSpotifyTrack;
using SmartHomeHub.Application.Features.Integrations.Commands.SkipToPreviousSpotifyTrack;
using SmartHomeHub.Application.Features.Integrations.Commands.StartSpotifyConnection;
using SmartHomeHub.Application.Features.Integrations.Commands.ToggleSpotifyPlayback;
using SmartHomeHub.Application.Features.Integrations.Queries.GetSpotifyPlayback;
using SmartHomeHub.Application.Features.Integrations.Queries.GetSpotifyStatus;

namespace SmartHomeHub.Api.Endpoints;

public static class SpotifyEndpoints
{
    public static void MapSpotifyEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet(
                "/api/integrations/spotify/login",
                async (ClaimsPrincipal userToken, IMediator mediator, CancellationToken cancellationToken) =>
                {
                    var firebaseUid = userToken.FindFirst("user_id")?.Value;
                    if (string.IsNullOrEmpty(firebaseUid))
                        return Results.Unauthorized();

                    var result = await mediator.Send(
                        new StartSpotifyConnectionCommand(firebaseUid),
                        cancellationToken
                    );

                    if (result.IsFailure)
                        return result.ToProblemDetails();

                    return Results.Ok(new { authorizeUrl = result.Value });
                }
            )
            .RequireAuthorization()
            .WithTags("🎵 Spotify")
            .WithSummary("Gera a URL de autorização OAuth2 do Spotify")
            .Produces<object>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status401Unauthorized);

        app.MapGet(
                "/api/integrations/spotify/callback",
                async (
                    string? code,
                    string? state,
                    IMediator mediator,
                    IConfiguration configuration,
                    CancellationToken cancellationToken
                ) =>
                {
                    var frontendBaseUrl =
                        configuration["Frontend:BaseUrl"] ?? "http://localhost:5173";

                    if (string.IsNullOrEmpty(code) || string.IsNullOrEmpty(state))
                        return Results.Redirect($"{frontendBaseUrl}/settings?spotify=error");

                    var result = await mediator.Send(
                        new CompleteSpotifyConnectionCommand(state, code),
                        cancellationToken
                    );

                    return Results.Redirect(
                        result.IsSuccess
                            ? $"{frontendBaseUrl}/settings?spotify=connected"
                            : $"{frontendBaseUrl}/settings?spotify=error"
                    );
                }
            )
            .WithTags("🎵 Spotify")
            .WithSummary("Callback OAuth2 do Spotify (chamado pelo próprio Spotify, sem autenticação)")
            .Produces(StatusCodes.Status302Found);

        app.MapGet(
                "/api/integrations/spotify/status",
                async (ClaimsPrincipal userToken, IMediator mediator, CancellationToken cancellationToken) =>
                {
                    var firebaseUid = userToken.FindFirst("user_id")?.Value;
                    if (string.IsNullOrEmpty(firebaseUid))
                        return Results.Unauthorized();

                    var status = await mediator.Send(
                        new GetSpotifyStatusQuery(firebaseUid),
                        cancellationToken
                    );

                    return Results.Ok(status);
                }
            )
            .RequireAuthorization()
            .WithTags("🎵 Spotify")
            .WithSummary("Verifica se o usuário tem uma conta Spotify conectada")
            .Produces<SpotifyStatusDto>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status401Unauthorized);

        app.MapDelete(
                "/api/integrations/spotify",
                async (ClaimsPrincipal userToken, IMediator mediator, CancellationToken cancellationToken) =>
                {
                    var firebaseUid = userToken.FindFirst("user_id")?.Value;
                    if (string.IsNullOrEmpty(firebaseUid))
                        return Results.Unauthorized();

                    await mediator.Send(new DisconnectSpotifyCommand(firebaseUid), cancellationToken);

                    return Results.NoContent();
                }
            )
            .RequireAuthorization()
            .WithTags("🎵 Spotify")
            .WithSummary("Desconecta a conta Spotify do usuário")
            .Produces(StatusCodes.Status204NoContent)
            .ProducesProblem(StatusCodes.Status401Unauthorized);

        app.MapGet(
                "/api/integrations/spotify/playback",
                async (ClaimsPrincipal userToken, IMediator mediator, CancellationToken cancellationToken) =>
                {
                    var firebaseUid = userToken.FindFirst("user_id")?.Value;
                    if (string.IsNullOrEmpty(firebaseUid))
                        return Results.Unauthorized();

                    var playback = await mediator.Send(
                        new GetSpotifyPlaybackQuery(firebaseUid),
                        cancellationToken
                    );

                    return Results.Ok(playback);
                }
            )
            .RequireAuthorization()
            .WithTags("🎵 Spotify")
            .WithSummary("Consulta o playback atual do Spotify (capa, título, artista, volume)")
            .ProducesProblem(StatusCodes.Status401Unauthorized);

        app.MapPut(
                "/api/integrations/spotify/volume",
                async (
                    SetSpotifyVolumeRequest request,
                    ClaimsPrincipal userToken,
                    IMediator mediator,
                    CancellationToken cancellationToken
                ) =>
                {
                    var firebaseUid = userToken.FindFirst("user_id")?.Value;
                    if (string.IsNullOrEmpty(firebaseUid))
                        return Results.Unauthorized();

                    var result = await mediator.Send(
                        new SetSpotifyVolumeCommand(firebaseUid, request.Volume),
                        cancellationToken
                    );

                    if (result.IsFailure)
                        return result.ToProblemDetails();

                    return Results.Ok(new { message = "Volume ajustado com sucesso." });
                }
            )
            .RequireAuthorization()
            .WithTags("🎵 Spotify")
            .WithSummary("Ajusta o volume do dispositivo Spotify ativo")
            .Produces<object>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status401Unauthorized);

        app.MapPut(
                "/api/integrations/spotify/toggle",
                async (ClaimsPrincipal userToken, IMediator mediator, CancellationToken cancellationToken) =>
                {
                    var firebaseUid = userToken.FindFirst("user_id")?.Value;
                    if (string.IsNullOrEmpty(firebaseUid))
                        return Results.Unauthorized();

                    var result = await mediator.Send(
                        new ToggleSpotifyPlaybackCommand(firebaseUid),
                        cancellationToken
                    );

                    if (result.IsFailure)
                        return result.ToProblemDetails();

                    return Results.Ok(new { message = "Comando enviado com sucesso." });
                }
            )
            .RequireAuthorization()
            .WithTags("🎵 Spotify")
            .WithSummary("Alterna play/pause no dispositivo Spotify ativo")
            .Produces<object>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status401Unauthorized);

        app.MapPost(
                "/api/integrations/spotify/next",
                async (ClaimsPrincipal userToken, IMediator mediator, CancellationToken cancellationToken) =>
                {
                    var firebaseUid = userToken.FindFirst("user_id")?.Value;
                    if (string.IsNullOrEmpty(firebaseUid))
                        return Results.Unauthorized();

                    var result = await mediator.Send(
                        new SkipToNextSpotifyTrackCommand(firebaseUid),
                        cancellationToken
                    );

                    if (result.IsFailure)
                        return result.ToProblemDetails();

                    return Results.Ok(new { message = "Comando enviado com sucesso." });
                }
            )
            .RequireAuthorization()
            .WithTags("🎵 Spotify")
            .WithSummary("Pula para a próxima faixa no dispositivo Spotify ativo")
            .Produces<object>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status401Unauthorized);

        app.MapPost(
                "/api/integrations/spotify/previous",
                async (ClaimsPrincipal userToken, IMediator mediator, CancellationToken cancellationToken) =>
                {
                    var firebaseUid = userToken.FindFirst("user_id")?.Value;
                    if (string.IsNullOrEmpty(firebaseUid))
                        return Results.Unauthorized();

                    var result = await mediator.Send(
                        new SkipToPreviousSpotifyTrackCommand(firebaseUid),
                        cancellationToken
                    );

                    if (result.IsFailure)
                        return result.ToProblemDetails();

                    return Results.Ok(new { message = "Comando enviado com sucesso." });
                }
            )
            .RequireAuthorization()
            .WithTags("🎵 Spotify")
            .WithSummary("Volta para a faixa anterior no dispositivo Spotify ativo")
            .Produces<object>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status401Unauthorized);
    }
}

public record SetSpotifyVolumeRequest(int Volume);
