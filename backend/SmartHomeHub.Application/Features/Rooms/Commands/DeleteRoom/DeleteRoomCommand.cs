using Mediator;
using Microsoft.EntityFrameworkCore;
using SmartHomeHub.Application.Common.Interfaces;

namespace SmartHomeHub.Application.Features.Rooms.Commands.DeleteRoom;

public record DeleteRoomCommand(Guid RoomId, string FirebaseUid) : ICommand<bool>;

public class DeleteRoomCommandHandler(IAppDbContext dbContext) : ICommandHandler<DeleteRoomCommand, bool>
{
    public async ValueTask<bool> Handle(DeleteRoomCommand request, CancellationToken cancellationToken)
    {
        var user = await dbContext.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(user => user.ExternalAuthUid == request.FirebaseUid, cancellationToken);

        if (user == null)
            return false;

        var room = await dbContext.Rooms
            .FirstOrDefaultAsync(room => room.Id == request.RoomId && room.UserId == user.Id, cancellationToken);

        if (room == null)
            return false;

        dbContext.Rooms.Remove(room);
        await dbContext.SaveChangesAsync(cancellationToken);

        return true;
    }
}