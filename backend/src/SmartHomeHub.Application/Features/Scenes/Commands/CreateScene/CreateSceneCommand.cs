using FluentValidation;
using Mediator;
using Microsoft.EntityFrameworkCore;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Application.Features.Scenes.Common;
using SmartHomeHub.Domain.Common.Primitives;
using SmartHomeHub.Domain.Entities;

namespace SmartHomeHub.Application.Features.Scenes.Commands.CreateScene;

public record CreateSceneCommand(
    string Name,
    string? Icon,
    List<SceneItemInput> Items,
    string FirebaseUid
) : ICommand<Result<Guid>>;

public class CreateSceneCommandValidator : AbstractValidator<CreateSceneCommand>
{
    public CreateSceneCommandValidator()
    {
        this.AddSceneRules(
            command => command.Name,
            command => command.Icon,
            command => command.Items
        );
    }
}

public class CreateSceneCommandHandler(IAppDbContext dbContext)
    : ICommandHandler<CreateSceneCommand, Result<Guid>>
{
    public async ValueTask<Result<Guid>> Handle(
        CreateSceneCommand request,
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
            return Result.Failure<Guid>(new Error("User.NotFound", "Usuário não encontrado."));

        var devicesResult = await SceneItemsSynchronizer.ValidateDevicesAsync(
            dbContext,
            user.Id,
            request.Items,
            cancellationToken
        );

        if (devicesResult.IsFailure)
            return Result.Failure<Guid>(devicesResult.Error);

        var scene = new Scene
        {
            UserId = user.Id,
            Name = request.Name,
            Icon = request.Icon,
        };

        SceneItemsSynchronizer.Apply(dbContext, scene, request.Items);

        dbContext.Scenes.Add(scene);
        await dbContext.SaveChangesAsync(cancellationToken);

        return Result.Success(scene.Id);
    }
}
