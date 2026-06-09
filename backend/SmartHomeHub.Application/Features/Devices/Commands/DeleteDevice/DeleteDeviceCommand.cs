using Mediator;
using Microsoft.EntityFrameworkCore;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Domain.Common;

namespace SmartHomeHub.Application.Features.Devices.Commands.DeleteDevice;

public record DeleteDeviceCommand(Guid DeviceId, string FirebaseUid) : ICommand<Result>;

public class DeleteDeviceCommandHandler(IAppDbContext dbContext)
    : ICommandHandler<DeleteDeviceCommand, Result>
{
    public async ValueTask<Result> Handle(
        DeleteDeviceCommand request,
        CancellationToken cancellationToken
    )
    {
        var user = await dbContext
            .Users.AsNoTracking()
            .FirstOrDefaultAsync(
                user => user.ExternalAuthUid == request.FirebaseUid,
                cancellationToken
            );

        if (user == null)
            return Result.Failure(new Error("User.NotFound", "Usuário não encontrado no sistema."));

        var device = await dbContext.Devices.FirstOrDefaultAsync(
            device => device.Id == request.DeviceId && device.UserId == user.Id,
            cancellationToken
        );

        if (device == null)
            return Result.Failure(
                new Error(
                    "Device.NotFound",
                    "Dispositivo não encontrado ou sem permissão para exclusão."
                )
            );

        dbContext.Devices.Remove(device);
        await dbContext.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}
