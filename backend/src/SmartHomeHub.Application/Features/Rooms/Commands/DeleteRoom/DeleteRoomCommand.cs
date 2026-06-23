using Mediator;
using Microsoft.EntityFrameworkCore;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Domain.Common.Primitives;

namespace SmartHomeHub.Application.Features.Rooms.Commands.DeleteRoom;

public record DeleteRoomCommand(Guid RoomId, string FirebaseUid) : ICommand<Result>;

public class DeleteRoomCommandHandler(IAppDbContext dbContext)
    : ICommandHandler<DeleteRoomCommand, Result>
{
    public async ValueTask<Result> Handle(
        DeleteRoomCommand request,
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

        dbContext.Rooms.Remove(room);
        await dbContext.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}
