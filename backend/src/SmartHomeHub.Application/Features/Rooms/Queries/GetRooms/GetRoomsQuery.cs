using Mediator;
using Microsoft.EntityFrameworkCore;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Application.Common.Pagination;

namespace SmartHomeHub.Application.Features.Rooms.Queries.GetRooms;

public record RoomDto(Guid Id, string Name, string? Icon);

public record GetRoomsQuery(string FirebaseUid, int Page = 1, int PageSize = 10)
    : IQuery<PagedResult<RoomDto>>,
        IPagedQuery;

public class GetRoomsQueryHandler(IAppDbContext dbContext)
    : IQueryHandler<GetRoomsQuery, PagedResult<RoomDto>>
{
    public async ValueTask<PagedResult<RoomDto>> Handle(
        GetRoomsQuery request,
        CancellationToken cancellationToken
    )
    {
        return await dbContext
            .Rooms.AsNoTracking()
            .Where(room => room.User.ExternalAuthUid == request.FirebaseUid)
            .OrderBy(room => room.Name)
            .Select(room => new RoomDto(room.Id, room.Name, room.Icon))
            .ToPagedResultAsync(request.Page, request.PageSize, cancellationToken);
    }
}
