using Mediator;
using Microsoft.EntityFrameworkCore;
using SmartHomeHub.Application.Common.Interfaces;
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

public record GetDeviceGroupsQuery(string FirebaseUid) : IQuery<List<DeviceGroupDto>>;

public class GetDeviceGroupsQueryHandler(IAppDbContext dbContext)
    : IQueryHandler<GetDeviceGroupsQuery, List<DeviceGroupDto>>
{
    public async ValueTask<List<DeviceGroupDto>> Handle(
        GetDeviceGroupsQuery request,
        CancellationToken cancellationToken
    )
    {
        return await dbContext
            .DeviceGroups.AsNoTracking()
            .Where(group => group.User.ExternalAuthUid == request.FirebaseUid)
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
            .ToListAsync(cancellationToken);
    }
}
