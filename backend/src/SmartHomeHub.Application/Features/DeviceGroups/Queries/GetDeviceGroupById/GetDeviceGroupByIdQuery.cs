using Mediator;
using Microsoft.EntityFrameworkCore;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Application.Features.DeviceGroups.Queries.GetDeviceGroups;

namespace SmartHomeHub.Application.Features.DeviceGroups.Queries.GetDeviceGroupById;

public record GetDeviceGroupByIdQuery(Guid GroupId, string FirebaseUid) : IQuery<DeviceGroupDto?>;

public class GetDeviceGroupByIdQueryHandler(IAppDbContext dbContext)
    : IQueryHandler<GetDeviceGroupByIdQuery, DeviceGroupDto?>
{
    public async ValueTask<DeviceGroupDto?> Handle(
        GetDeviceGroupByIdQuery request,
        CancellationToken cancellationToken
    )
    {
        return await dbContext
            .DeviceGroups.AsNoTracking()
            .Where(group =>
                group.Id == request.GroupId && group.User!.ExternalAuthUid == request.FirebaseUid
            )
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
            .FirstOrDefaultAsync(cancellationToken);
    }
}
