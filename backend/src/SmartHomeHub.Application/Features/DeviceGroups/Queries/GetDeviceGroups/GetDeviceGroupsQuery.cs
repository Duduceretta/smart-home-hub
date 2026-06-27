using Mediator;
using Microsoft.EntityFrameworkCore;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Application.Common.Pagination;
using SmartHomeHub.Domain.Enums;

namespace SmartHomeHub.Application.Features.DeviceGroups.Queries.GetDeviceGroups;

public record DeviceInGroupDto(
    Guid Id,
    string Name,
    string Brand,
    string ExternalId,
    DeviceType Type,
    bool IsOn
);

public record DeviceGroupDto(Guid Id, string Name, string? Icon, List<DeviceInGroupDto> Devices);

public record GetDeviceGroupsQuery(string FirebaseUid, int Page = 1, int PageSize = 10)
    : IQuery<PagedResult<DeviceGroupDto>>,
        IPagedQuery;

public class GetDeviceGroupsQueryHandler(IAppDbContext dbContext)
    : IQueryHandler<GetDeviceGroupsQuery, PagedResult<DeviceGroupDto>>
{
    public async ValueTask<PagedResult<DeviceGroupDto>> Handle(
        GetDeviceGroupsQuery request,
        CancellationToken cancellationToken
    )
    {
        return await dbContext
            .DeviceGroups.AsNoTracking()
            .Where(group => group.User.ExternalAuthUid == request.FirebaseUid)
            .OrderBy(group => group.Name)
            .Select(group => new DeviceGroupDto(
                group.Id,
                group.Name,
                group.Icon,
                group
                    .Devices.Select(device => new DeviceInGroupDto(
                        device.Id,
                        device.Name,
                        device.Brand,
                        device.ExternalId,
                        device.Type,
                        device.IsOn
                    ))
                    .ToList()
            ))
            .ToPagedResultAsync(request.Page, request.PageSize, cancellationToken);
    }
}
