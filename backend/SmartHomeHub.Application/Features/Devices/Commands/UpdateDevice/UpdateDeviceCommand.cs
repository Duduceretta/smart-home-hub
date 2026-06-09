using FluentValidation;
using Mediator;
using Microsoft.EntityFrameworkCore;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Domain.Common;
using SmartHomeHub.Domain.Enums;

namespace SmartHomeHub.Application.Features.Devices.Commands.UpdateDevice;

public record UpdateDeviceCommand(
    Guid DeviceId,
    string Name,
    string Brand,
    string ExternalId,
    DeviceType Type,
    Guid? RoomId,
    string FirebaseUid
) : ICommand<Result>;

public class UpdateDeviceCommandValidator : AbstractValidator<UpdateDeviceCommand>
{
    public UpdateDeviceCommandValidator()
    {
        RuleFor(command => command.DeviceId)
            .NotEmpty()
            .WithMessage("O ID do dispositivo é obrigatório.");

        RuleFor(command => command.Name)
            .NotEmpty()
            .WithMessage("O nome do dispositivo é obrigatório.")
            .MaximumLength(100);

        RuleFor(command => command.Brand)
            .NotEmpty()
            .WithMessage("A marca do dispositivo é obrigatória.")
            .MaximumLength(50);

        RuleFor(command => command.ExternalId)
            .NotEmpty()
            .WithMessage("O identificador físico (MAC/ID) é obrigatório.");

        RuleFor(command => command.Type)
            .IsInEnum()
            .WithMessage("O tipo de dispositivo fornecido é inválido.");
    }
}

public class UpdateDeviceCommandHandler(IAppDbContext dbContext)
    : ICommandHandler<UpdateDeviceCommand, Result>
{
    public async ValueTask<Result> Handle(
        UpdateDeviceCommand request,
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
                new Error("Device.NotFound", "Dispositivo não encontrado ou sem permissão.")
            );

        if (request.RoomId.HasValue && request.RoomId != device.RoomId)
        {
            var roomExists = await dbContext.Rooms.AnyAsync(
                room => room.Id == request.RoomId.Value && room.UserId == user.Id,
                cancellationToken
            );

            if (!roomExists)
                return Result.Failure(
                    new Error(
                        "Room.NotFound",
                        "Ambiente não encontrado ou sem permissão de acesso."
                    )
                );
        }

        device.Name = request.Name;
        device.Brand = request.Brand;
        device.ExternalId = request.ExternalId;
        device.Type = request.Type;
        device.RoomId = request.RoomId;

        await dbContext.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}
