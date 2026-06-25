using Mediator;
using Microsoft.EntityFrameworkCore;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Application.Features.Devices.Queries.GetDevices;

namespace SmartHomeHub.Application.Features.Devices.Queries.GetDeviceById;

public record GetDeviceByIdQuery(Guid DeviceId, string FirebaseUid) : IQuery<DeviceDto?>;

public class GetDeviceByIdQueryHandler(IAppDbContext dbContext)
    : IQueryHandler<GetDeviceByIdQuery, DeviceDto?>
{
    public async ValueTask<DeviceDto?> Handle(
        GetDeviceByIdQuery request,
        CancellationToken cancellationToken
    )
    {
        return await dbContext
            .Devices.AsNoTracking()
            .Where(device =>
                device.Id == request.DeviceId && device.User.ExternalAuthUid == request.FirebaseUid
            )
            .Select(device => new DeviceDto(
                device.Id,
                device.Name,
                device.Brand,
                device.ExternalId,
                device.Type,
                device.IsOn,
                device.RoomId
            ))
            .FirstOrDefaultAsync(cancellationToken);
    }
}
