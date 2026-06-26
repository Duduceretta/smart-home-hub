using Mediator;
using Microsoft.EntityFrameworkCore;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Domain.Common.Primitives;

namespace SmartHomeHub.Application.Features.DeviceGroups.Commands.DeleteDeviceGroup;

public record DeleteDeviceGroupCommand(Guid GroupId, string FirebaseUid) : ICommand<Result>;

public class DeleteDeviceGroupCommandHandler(IAppDbContext dbContext)
    : ICommandHandler<DeleteDeviceGroupCommand, Result>
{
    public async ValueTask<Result> Handle(
        DeleteDeviceGroupCommand request,
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
            return Result.Failure(new Error("User.NotFound", "Usuário não encontrado."));

        var group = await dbContext
            .DeviceGroups.Include(group => group.Devices)
            .FirstOrDefaultAsync(
                group => group.Id == request.GroupId && group.UserId == user.Id,
                cancellationToken
            );

        if (group == null)
            return Result.Failure(
                new Error(
                    "DeviceGroup.NotFound",
                    "Grupo não encontrado ou sem permissão para exclusão."
                )
            );

        group.Devices.Clear();

        dbContext.DeviceGroups.Remove(group);
        await dbContext.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}
