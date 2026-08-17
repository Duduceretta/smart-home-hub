using Mapster;
using Mediator;
using Microsoft.EntityFrameworkCore;
using SmartHomeHub.Application.Common.Extensions;
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
    IntegrationType IntegrationType,
    string? IpAddress,
    string Category,
    string Room,
    Guid? RoomId,
    bool IsOnline,
    bool IsOn,
    int LastActivityMinutes
);

public record GetDevicesQuery(
    string FirebaseUid,
    string? Query = null,
    string? Category = null,
    string? Status = null,
    int Page = 1,
    int PageSize = 10
) : IQuery<PagedResult<DeviceDto>>, IPagedQuery;

public class GetDevicesQueryHandler(IAppDbContext dbContext)
    : IQueryHandler<GetDevicesQuery, PagedResult<DeviceDto>>
{
    public async ValueTask<PagedResult<DeviceDto>> Handle(
        GetDevicesQuery request,
        CancellationToken cancellationToken
    )
    {
        var rawDevices = await dbContext
            .Devices.AsNoTracking()
            .Include(device => device.Room)
            .Where(device => device.User.ExternalAuthUid == request.FirebaseUid)
            .FilterByCategory(request.Category)
            .FilterByStatus(request.Status)
            .FilterBySearchTerm(request.Query)
            .OrderBy(device => device.Name)
            .ToPagedResultAsync(request.Page, request.PageSize, cancellationToken);

        var items = rawDevices.Items.Adapt<List<DeviceDto>>();

        return PagedResult<DeviceDto>.Create(
            items,
            rawDevices.Page,
            rawDevices.PageSize,
            rawDevices.TotalCount
        );
    }
}
