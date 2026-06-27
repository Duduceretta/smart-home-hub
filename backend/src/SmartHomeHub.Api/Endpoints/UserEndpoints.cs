using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using SmartHomeHub.Domain.Entities;
using SmartHomeHub.Infrastructure.Persistence;

namespace SmartHomeHub.Api.Endpoints;

public static class UserEndpoints
{
    public static void MapUserEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapPost(
                "/api/users/sync",
                async (AppDbContext db, ClaimsPrincipal userToken) =>
                {
                    var firebaseUid = userToken.FindFirst("user_id")?.Value;

                    if (string.IsNullOrEmpty(firebaseUid))
                        return Results.Unauthorized();

                    var userExists = await db.Users.FirstOrDefaultAsync(user =>
                        user.ExternalAuthUid == firebaseUid
                    );

                    if (userExists != null)
                        return Results.Ok(
                            new { message = "Usuário já existe no banco.", userId = userExists.Id }
                        );

                    var newUser = new User
                    {
                        ExternalAuthUid = firebaseUid,
                        Email =
                            userToken.FindFirst(ClaimTypes.Email)?.Value ?? "email-nao-informado",
                        Name = "Usuário do Hub",
                    };

                    db.Users.Add(newUser);
                    await db.SaveChangesAsync();

                    return Results.Created(
                        $"/api/users/{newUser.Id}",
                        new { message = "Usuário sincronizado com sucesso!", userId = newUser.Id }
                    );
                }
            )
            .RequireAuthorization()
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
