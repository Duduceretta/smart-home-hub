using FluentValidation;
using Mediator;
using Microsoft.EntityFrameworkCore;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Application.Features.Scenes.Common;
using SmartHomeHub.Domain.Common.Primitives;

namespace SmartHomeHub.Application.Features.Scenes.Commands.UpdateScene;

public record UpdateSceneCommand(
    Guid SceneId,
    string Name,
    string? Icon,
    List<SceneItemInput> Items,
    string FirebaseUid
) : ICommand<Result>;

public class UpdateSceneCommandValidator : AbstractValidator<UpdateSceneCommand>
{
    public UpdateSceneCommandValidator()
    {
        RuleFor(command => command.SceneId).NotEmpty().WithMessage("O ID da cena é obrigatório.");

        this.AddSceneRules(
            command => command.Name,
            command => command.Icon,
            command => command.Items
        );
    }
}

public class UpdateSceneCommandHandler(IAppDbContext dbContext)
    : ICommandHandler<UpdateSceneCommand, Result>
{
    public async ValueTask<Result> Handle(
        UpdateSceneCommand request,
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

        var scene = await dbContext
            .Scenes.Include(scene => scene.Items)
            .FirstOrDefaultAsync(
                scene => scene.Id == request.SceneId && scene.UserId == user.Id,
                cancellationToken
            );

        if (scene == null)
            return Result.Failure(
                new Error("Scene.NotFound", "Cena não encontrada ou sem permissão de acesso.")
            );

        var devicesResult = await SceneItemsSynchronizer.ValidateDevicesAsync(
            dbContext,
            user.Id,
            request.Items,
            cancellationToken
        );

        if (devicesResult.IsFailure)
            return devicesResult;

        scene.Name = request.Name;
        scene.Icon = request.Icon;
        SceneItemsSynchronizer.Apply(dbContext, scene, request.Items);

        await dbContext.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}
