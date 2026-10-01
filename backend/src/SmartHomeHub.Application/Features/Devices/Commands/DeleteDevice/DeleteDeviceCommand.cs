using Mediator;
using Microsoft.EntityFrameworkCore;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Domain.Common.Primitives;

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

        // O soft-delete do Device nunca aciona a FK de SceneItem (a linha continua existindo),
        // então os itens de cena que o referenciam são removidos aqui, em memória, igual ao
        // DeleteRoomCommandHandler faz com Device.RoomId. IgnoreQueryFilters pega também os
        // itens de cenas já apagadas, que o filtro padrão esconde.
        var sceneItems = await dbContext
            .SceneItems.IgnoreQueryFilters()
            .Where(item => item.DeviceId == device.Id)
            .ToListAsync(cancellationToken);

        dbContext.SceneItems.RemoveRange(sceneItems);

        dbContext.Devices.Remove(device);
        await dbContext.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}
