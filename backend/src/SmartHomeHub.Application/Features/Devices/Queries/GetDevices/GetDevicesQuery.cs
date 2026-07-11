using Mapster;
using Mediator;
using Microsoft.EntityFrameworkCore;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Application.Common.Pagination;
using SmartHomeHub.Domain.Enums;

namespace SmartHomeHub.Application.Features.Devices.Queries.GetDevices;

public record DeviceDto(
    Guid Id,
    string Name,
    string Brand,
    string ExternalId,
    string? IpAddress,
    DeviceType Type,
    string Category,
    string Room,
    Guid? RoomId,
    bool IsOnline,
    bool IsOn,
    int LastActivityMinutes
);

public record GetDevicesQuery(string FirebaseUid, int Page = 1, int PageSize = 10)
    : IQuery<PagedResult<DeviceDto>>,
        IPagedQuery;

public class GetDevicesQueryHandler(IAppDbContext dbContext)
    : IQueryHandler<GetDevicesQuery, PagedResult<DeviceDto>>
{
    public async ValueTask<PagedResult<DeviceDto>> Handle(
        GetDevicesQuery request,
        CancellationToken cancellationToken
    )
    {
        var query = dbContext
            .Devices.AsNoTracking()
            .Include(device => device.Room)
            .Where(device => device.User.ExternalAuthUid == request.FirebaseUid)
            .OrderBy(device => device.Name);

        var totalCount = await query.CountAsync(cancellationToken);

        var rawDevices = await query
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToListAsync(cancellationToken);

        var items = rawDevices.Adapt<List<DeviceDto>>();

        return PagedResult<DeviceDto>.Create(items, request.Page, request.PageSize, totalCount);
    }
}
