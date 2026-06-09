using Mediator;
using Microsoft.EntityFrameworkCore;
using SmartHomeHub.Application.Common.Interfaces;
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

public record GetDevicesQuery(string FirebaseUid) : IQuery<List<DeviceDto>>;

public class GetDevicesQueryHandler(IAppDbContext dbContext)
    : IQueryHandler<GetDevicesQuery, List<DeviceDto>>
{
    public async ValueTask<List<DeviceDto>> Handle(
        GetDevicesQuery request,
        CancellationToken cancellationToken
    )
    {
        return await dbContext
            .Devices.AsNoTracking()
            .Where(device => device.User.ExternalAuthUid == request.FirebaseUid)
            .Select(device => new DeviceDto(
                device.Id,
                device.Name,
                device.Brand,
                device.ExternalId,
                device.Type,
                device.IsOn,
                device.RoomId
            ))
            .ToListAsync(cancellationToken);
    }
}
