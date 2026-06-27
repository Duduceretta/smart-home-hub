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
    DeviceType Type,
    bool IsOn,
    Guid? RoomId
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
        return await dbContext
            .Devices.AsNoTracking()
            .Where(device => device.User.ExternalAuthUid == request.FirebaseUid)
            .OrderBy(device => device.Name)
            .Select(device => new DeviceDto(
                device.Id,
                device.Name,
                device.Brand,
                device.ExternalId,
                device.Type,
                device.IsOn,
                device.RoomId
            ))
            .ToPagedResultAsync(request.Page, request.PageSize, cancellationToken); // 3. Substituímos o ToListAsync
    }
}
