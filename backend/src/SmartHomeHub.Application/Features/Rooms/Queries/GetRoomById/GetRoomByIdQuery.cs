using Mediator;
using Microsoft.EntityFrameworkCore;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Application.Features.Rooms.Queries.GetRooms;

namespace SmartHomeHub.Application.Features.Rooms.Queries.GetRoomById;

public record GetRoomByIdQuery(Guid RoomId, string FirebaseUid) : IQuery<RoomDto?>;

public class GetRoomByIdQueryHandler(IAppDbContext dbContext)
    : IQueryHandler<GetRoomByIdQuery, RoomDto?>
{
    public async ValueTask<RoomDto?> Handle(
        GetRoomByIdQuery request,
        CancellationToken cancellationToken
    )
    {
        return await dbContext
            .Rooms.AsNoTracking()
            .Where(room =>
                room.Id == request.RoomId && room.User.ExternalAuthUid == request.FirebaseUid
            )
            .Select(room => new RoomDto(room.Id, room.Name, room.Icon))
            .FirstOrDefaultAsync(cancellationToken);
    }
}
