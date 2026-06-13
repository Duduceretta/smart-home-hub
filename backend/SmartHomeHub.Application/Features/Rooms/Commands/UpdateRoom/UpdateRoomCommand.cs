using FluentValidation;
using Mediator;
using Microsoft.EntityFrameworkCore;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Domain.Common.Primitives;

namespace SmartHomeHub.Application.Features.Rooms.Commands.UpdateRoom;

public record UpdateRoomCommand(Guid RoomId, string Name, string Icon, string FirebaseUid)
    : ICommand<Result>;

public class UpdateRoomCommandValidator : AbstractValidator<UpdateRoomCommand>
{
    public UpdateRoomCommandValidator()
    {
        RuleFor(command => command.RoomId).NotEmpty().WithMessage("O ID da sala é obrigatório.");

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

public class UpdateRoomCommandHandler(IAppDbContext dbContext)
    : ICommandHandler<UpdateRoomCommand, Result>
{
    public async ValueTask<Result> Handle(
        UpdateRoomCommand request,
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
            return Result.Failure(new Error("User.NotFound", "Usuário não encontrado no sistema."));

        var room = await dbContext.Rooms.FirstOrDefaultAsync(
            room => room.Id == request.RoomId && room.UserId == user.Id,
            cancellationToken
        );

        if (room == null)
            return Result.Failure(
                new Error("Room.NotFound", "Ambiente não encontrado ou sem permissão de acesso.")
            );

        room.Name = request.Name;
        room.Icon = request.Icon;

        await dbContext.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}
