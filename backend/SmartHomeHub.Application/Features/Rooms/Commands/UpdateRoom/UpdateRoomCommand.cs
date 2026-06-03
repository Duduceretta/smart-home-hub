using Mediator;
using Microsoft.EntityFrameworkCore;
using SmartHomeHub.Application.Common.Interfaces;

namespace SmartHomeHub.Application.Features.Rooms.Commands.UpdateRoom;

public record UpdateRoomCommand(Guid RoomId, string Name, string Icon, string FirebaseUid) : ICommand<bool>;

public class UpdateRoomCommandHandler(IAppDbContext dbContext) : ICommandHandler<UpdateRoomCommand, bool>
{
    public async ValueTask<bool> Handle(UpdateRoomCommand request, CancellationToken cancellationToken)
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

        room.Name = request.Name;
        room.Icon = request.Icon;

        await dbContext.SaveChangesAsync(cancellationToken);

        return true;
    }
}