using FluentValidation;
using Mediator;
using Microsoft.EntityFrameworkCore;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Domain.Common.Primitives;
using SmartHomeHub.Domain.Entities;

namespace SmartHomeHub.Application.Features.Rooms.Commands.CreateRoom;

public record CreateRoomCommand(string Name, string Icon, string FirebaseUid)
    : ICommand<Result<Guid>>;

public class CreateRoomCommandValidator : AbstractValidator<CreateRoomCommand>
{
    public CreateRoomCommandValidator()
    {
        RuleFor(command => command.Name)
            .NotEmpty()
            .WithMessage("O nome do ambiente é obrigatório.")
            .MaximumLength(50)
            .WithMessage("O nome do ambiente não pode passar de 50 caracteres.");

        RuleFor(command => command.Icon)
            .NotEmpty()
            .WithMessage("O ícone do ambiente é obrigatório.");
    }
}

public class CreateRoomCommandHandler(IAppDbContext dbContext)
    : ICommandHandler<CreateRoomCommand, Result<Guid>>
{
    public async ValueTask<Result<Guid>> Handle(
        CreateRoomCommand request,
        CancellationToken cancellationToken
    )
    {
        var user = await dbContext.Users.FirstOrDefaultAsync(
            user => user.ExternalAuthUid == request.FirebaseUid,
            cancellationToken
        );

        if (user == null)
        {
            return Result.Failure<Guid>(
                new Error("User.NotFound", "Usuário não encontrado no sistema.")
            );
        }

        var room = new Room
        {
            Name = request.Name,
            Icon = request.Icon,
            UserId = user.Id,
        };

        dbContext.Rooms.Add(room);
        await dbContext.SaveChangesAsync(cancellationToken);

        return Result.Success(room.Id);
    }
}
