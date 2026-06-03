using Mediator;
using Microsoft.EntityFrameworkCore;
using SmartHomeHub.Application.Common.Interfaces;

namespace SmartHomeHub.Application.Features.Rooms.Queries.GetRooms;

public record RoomDto(Guid Id, string Name, string? Icon);

public record GetRoomsQuery(string FirebaseUid) : IQuery<List<RoomDto>>;

public class GetRoomsQueryHandler(IAppDbContext dbContext) : IQueryHandler<GetRoomsQuery, List<RoomDto>>
{
    public async ValueTask<List<RoomDto>> Handle(GetRoomsQuery request, CancellationToken cancellationToken)
    {
        var user = await dbContext.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(user => user.ExternalAuthUid == request.FirebaseUid, cancellationToken);

        if (user == null)
            return [];

        var rooms = await dbContext.Rooms
            .AsNoTracking()
            .Where(room => room.UserId == user.Id)
            .Select(room => new RoomDto(room.Id, room.Name, room.Icon))
            .ToListAsync(cancellationToken);

        return rooms;
    }
}