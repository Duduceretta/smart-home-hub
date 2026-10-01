using Mediator;
using Microsoft.EntityFrameworkCore;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Domain.Common.Primitives;

namespace SmartHomeHub.Application.Features.Scenes.Commands.DeleteScene;

public record DeleteSceneCommand(Guid SceneId, string FirebaseUid) : ICommand<Result>;

public class DeleteSceneCommandHandler(IAppDbContext dbContext)
    : ICommandHandler<DeleteSceneCommand, Result>
{
    public async ValueTask<Result> Handle(
        DeleteSceneCommand request,
        CancellationToken cancellationToken
    )
    {
        var user = await dbContext
            .Users.AsNoTracking()
            .FirstOrDefaultAsync(
                user => user.ExternalAuthUid == request.FirebaseUid,
                cancellationToken
            );

        if (user == null)
            return Result.Failure(new Error("User.NotFound", "Usuário não encontrado."));

        var scene = await dbContext.Scenes.FirstOrDefaultAsync(
            scene => scene.Id == request.SceneId && scene.UserId == user.Id,
            cancellationToken
        );

        if (scene == null)
            return Result.Failure(
                new Error("Scene.NotFound", "Cena não encontrada ou sem permissão de acesso.")
            );

        // Soft delete: os itens permanecem na tabela e ficam ocultos pelo query filter.
        dbContext.Scenes.Remove(scene);
        await dbContext.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}
