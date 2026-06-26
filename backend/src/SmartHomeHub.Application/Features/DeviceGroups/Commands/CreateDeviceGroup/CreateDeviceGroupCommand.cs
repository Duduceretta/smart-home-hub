using FluentValidation;
using Mediator;
using Microsoft.EntityFrameworkCore;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Domain.Common.Primitives;
using SmartHomeHub.Domain.Entities;

namespace SmartHomeHub.Application.Features.DeviceGroups.Commands.CreateDeviceGroup;

public record CreateDeviceGroupCommand(
    string Name,
    string? Icon,
    List<Guid> DeviceIds,
    string FirebaseUid
) : ICommand<Result<Guid>>;

public class CreateDeviceGroupCommandValidator : AbstractValidator<CreateDeviceGroupCommand>
{
    public CreateDeviceGroupCommandValidator()
    {
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

public class CreateDeviceGroupCommandHandler(IAppDbContext dbContext)
    : ICommandHandler<CreateDeviceGroupCommand, Result<Guid>>
{
    public async ValueTask<Result<Guid>> Handle(
        CreateDeviceGroupCommand request,
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
            return Result.Failure<Guid>(new Error("User.NotFound", "Usuário não encontrado."));

        var group = new DeviceGroup
        {
            Name = request.Name,
            Icon = request.Icon,
            UserId = user.Id,
        };

        if (request.DeviceIds is { Count: > 0 })
        {
            var allowedDevices = await dbContext
                .Devices.Where(device =>
                    request.DeviceIds.Contains(device.Id) && device.UserId == user.Id
                )
                .ToListAsync(cancellationToken);

            if (allowedDevices.Count != request.DeviceIds.Count)
            {
                return Result.Failure<Guid>(
                    new Error(
                        "DeviceGroup.InvalidDevices",
                        "Um ou mais dispositivos informados não existem ou não pertencem à sua conta."
                    )
                );
            }

            group.Devices = allowedDevices;
        }

        dbContext.DeviceGroups.Add(group);
        await dbContext.SaveChangesAsync(cancellationToken);

        return Result.Success(group.Id);
    }
}
