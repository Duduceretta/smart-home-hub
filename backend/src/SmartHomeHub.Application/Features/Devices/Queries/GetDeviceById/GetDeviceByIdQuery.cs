using Mapster;
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
        var device = await dbContext
            .Devices.AsNoTracking()
            .Include(d => d.Room)
            .Include(d => d.LiveState)
            .FirstOrDefaultAsync(
                d => d.Id == request.DeviceId && d.User.ExternalAuthUid == request.FirebaseUid,
                cancellationToken
            );

        return device?.Adapt<DeviceDto>();
    }
}
