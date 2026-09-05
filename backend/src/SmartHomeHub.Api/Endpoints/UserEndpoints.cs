using System.Security.Claims;
using Mediator;
using SmartHomeHub.Api.Extensions;
using SmartHomeHub.Application.Features.Users.Commands.SyncUser;

namespace SmartHomeHub.Api.Endpoints;

public static class UserEndpoints
{
    public static void MapUserEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapPost(
                "/api/users/sync",
                async (
                    ClaimsPrincipal userToken,
                    IMediator mediator,
                    CancellationToken cancellationToken
                ) =>
                {
                    var firebaseUid = userToken.GetFirebaseUid();

                    if (string.IsNullOrEmpty(firebaseUid))
                        return Results.Unauthorized();

                    var email =
                        userToken.FindFirst(ClaimTypes.Email)?.Value ?? "email-nao-informado";

                    var command = new SyncUserCommand(firebaseUid, email);
                    var result = await mediator.Send(command, cancellationToken);

                    if (result.IsFailure)
                        return result.ToProblemDetails();

                    return result.Value.WasCreated
                        ? Results.Created(
                            $"/api/users/{result.Value.UserId}",
                            new
                            {
                                message = "Usuário sincronizado com sucesso!",
                                userId = result.Value.UserId,
                            }
                        )
                        : Results.Ok(
                            new
                            {
                                message = "Usuário já existe no banco.",
                                userId = result.Value.UserId,
                            }
                        );
                }
            )
            .RequireAuthorization()
            .RequireRateLimiting("AuthRateLimit")
            .WithTags("Users")
            .WithSummary("Sincroniza um usuário do Firebase com o banco local")
            .WithDescription(
                "Deve ser chamado logo após o primeiro login no front-end. Verifica se o UID do token já existe no Postgres. Se existir, retorna os dados. Se não, cria o registro inicial do usuário no ecossistema."
            )
            .Produces<object>(StatusCodes.Status200OK)
            .Produces<object>(StatusCodes.Status201Created)
            .Produces(StatusCodes.Status401Unauthorized);
    }
}
