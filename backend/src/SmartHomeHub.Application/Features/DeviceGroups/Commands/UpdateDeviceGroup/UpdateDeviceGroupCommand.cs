using FluentValidation;
using Mediator;
using Microsoft.EntityFrameworkCore;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Domain.Common.Primitives;

namespace SmartHomeHub.Application.Features.DeviceGroups.Commands.UpdateDeviceGroup;

public record UpdateDeviceGroupCommand(
    Guid GroupId,
    string Name,
    string? Icon,
    List<Guid> DeviceIds,
    string FirebaseUid
) : ICommand<Result>;

public class UpdateDeviceGroupCommandValidator : AbstractValidator<UpdateDeviceGroupCommand>
{
    public UpdateDeviceGroupCommandValidator()
    {
        RuleFor(command => command.GroupId).NotEmpty().WithMessage("O ID do grupo é obrigatório.");

        RuleFor(command => command.Name)
            .NotEmpty()
            .WithMessage("O nome do grupo é obrigatório.")
            .MaximumLength(100)
            .WithMessage("O nome do grupo deve ter no máximo 100 caracteres.");

        RuleFor(command => command.Icon)
            .MaximumLength(50)
            .WithMessage("O nome do ícone deve ter no máximo 50 caracteres.");
    }
}

public class UpdateDeviceGroupCommandHandler(IAppDbContext dbContext)
    : ICommandHandler<UpdateDeviceGroupCommand, Result>
{
    public async ValueTask<Result> Handle(
        UpdateDeviceGroupCommand request,
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
                    "Grupo não encontrado ou sem permissão de acesso."
                )
            );

        if (request.DeviceIds != null)
        {
            var allowedDevices = await dbContext
                .Devices.Where(device =>
                    request.DeviceIds.Contains(device.Id) && device.UserId == user.Id
                )
                .ToListAsync(cancellationToken);

            if (allowedDevices.Count != request.DeviceIds.Count)
            {
                return Result.Failure(
                    new Error(
                        "DeviceGroup.InvalidDevices",
                        "Um ou mais dispositivos informados não existem ou não pertencem à sua conta."
                    )
                );
            }

            group.Devices = allowedDevices;
        }

        group.Name = request.Name;
        group.Icon = request.Icon;

        await dbContext.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}
