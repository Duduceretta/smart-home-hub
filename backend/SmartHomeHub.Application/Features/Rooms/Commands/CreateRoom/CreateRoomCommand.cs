using Mediator;
using Microsoft.EntityFrameworkCore;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Domain.Entities;

namespace SmartHomeHub.Application.Features.Rooms.Commands.CreateRoom;

public record CreateRoomCommand(string Name, string Icon, string FirebaseUid) : ICommand<Guid>;

public class CreateRoomCommandHandler(IAppDbContext dbContext) : ICommandHandler<CreateRoomCommand, Guid>
{
    public async ValueTask<Guid> Handle(CreateRoomCommand request, CancellationToken cancellationToken)
    {
        var user = await dbContext.Users
            .FirstOrDefaultAsync(user => user.ExternalAuthUid == request.FirebaseUid, cancellationToken);

        if (user == null)
        {
            throw new UnauthorizedAccessException("Usuário não encontrado no sistema.");
        }

        var room = new Room
        {
            Name = request.Name,
            Icon = request.Icon,
            UserId = user.Id 
        };

        dbContext.Rooms.Add(room);
        await dbContext.SaveChangesAsync(cancellationToken);

        return room.Id;
    }
}