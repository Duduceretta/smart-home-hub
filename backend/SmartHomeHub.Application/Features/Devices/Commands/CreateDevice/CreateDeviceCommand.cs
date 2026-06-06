using FluentValidation;
using Mediator;
using Microsoft.EntityFrameworkCore;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Domain.Common;
using SmartHomeHub.Domain.Entities;
using SmartHomeHub.Domain.Enums;

namespace SmartHomeHub.Application.Features.Devices.Commands.CreateDevice;

public record CreateDeviceCommand(
    string Name, 
    string Brand, 
    string ExternalId, 
    DeviceType Type, 
    Guid? RoomId, 
    string FirebaseUid) : ICommand<Result<Guid>>;

public class CreateDeviceCommandValidator : AbstractValidator<CreateDeviceCommand>
{
    public CreateDeviceCommandValidator()
    {
        RuleFor(command => command.Name)
            .NotEmpty().WithMessage("O nome do dispositivo é obrigatório.")
            .MaximumLength(100);

        RuleFor(command => command.Brand)
            .NotEmpty().WithMessage("A marca do dispositivo é obrigatória.")
            .MaximumLength(50);

        RuleFor(command => command.ExternalId)
            .NotEmpty().WithMessage("O identificador físico (MAC/ID) é obrigatório.");

        RuleFor(command => command.Type)
            .IsInEnum().WithMessage("O tipo de dispositivo fornecido é inválido.");
    }
}

public class CreateDeviceCommandHandler(IAppDbContext dbContext) : ICommandHandler<CreateDeviceCommand, Result<Guid>>
{
    public async ValueTask<Result<Guid>> Handle(CreateDeviceCommand request, CancellationToken cancellationToken)
    {
        var user = await dbContext.Users
            .FirstOrDefaultAsync(user => user.ExternalAuthUid == request.FirebaseUid, cancellationToken);

        if (user == null)
            return Result.Failure<Guid>(new Error("User.NotFound", "Usuário não encontrado no sistema."));

        if (request.RoomId.HasValue)
        {
            var roomExists = await dbContext.Rooms
                .AnyAsync(room => room.Id == request.RoomId.Value && room.UserId == user.Id, cancellationToken);
            
            if (!roomExists)
                return Result.Failure<Guid>(new Error("Room.NotFound", "Ambiente não encontrado ou sem permissão de acesso."));
        }

        var device = new Device
        {
            Name = request.Name,
            Brand = request.Brand,
            ExternalId = request.ExternalId,
            Type = request.Type,
            RoomId = request.RoomId,
            UserId = user.Id
        };

        dbContext.Devices.Add(device);
        await dbContext.SaveChangesAsync(cancellationToken);

        return Result.Success(device.Id);
    }
}