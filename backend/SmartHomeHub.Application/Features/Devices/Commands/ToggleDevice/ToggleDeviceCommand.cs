using FluentValidation;
using Mediator;
using Microsoft.EntityFrameworkCore;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Domain.Common;
using System.Text.Json;

namespace SmartHomeHub.Application.Features.Devices.Commands.ToggleDevice;

public record ToggleDeviceCommand(Guid DeviceId, string FirebaseUid) : ICommand<Result>;

public class ToggleDeviceCommandValidator : AbstractValidator<ToggleDeviceCommand>
{
    public ToggleDeviceCommandValidator()
    {
        RuleFor(command => command.DeviceId)
            .NotEmpty().WithMessage("O ID do dispositivo é obrigatório.");
        
        RuleFor(command => command.FirebaseUid)
            .NotEmpty().WithMessage("O identificador do usuário é obrigatório.");
    }
}

public class ToggleDeviceCommandHandler(
    IAppDbContext dbContext, 
    IMqttService mqttService) : ICommandHandler<ToggleDeviceCommand, Result>
{
    public async ValueTask<Result> Handle(ToggleDeviceCommand request, CancellationToken cancellationToken)
    {
        var user = await dbContext.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(user => user.ExternalAuthUid == request.FirebaseUid, cancellationToken);

        if (user == null)
            return Result.Failure(new Error("User.NotFound", "Usuário não encontrado."));

        var device = await dbContext.Devices
            .FirstOrDefaultAsync(device => device.Id == request.DeviceId && device.UserId == user.Id, cancellationToken);

        if (device == null)
            return Result.Failure(new Error("Device.NotFound", "Dispositivo não encontrado ou sem permissão."));

        var newState = !device.IsOn;
        
        var commandPayload = JsonSerializer.Serialize(new 
        { 
            action = newState ? "turn_on" : "turn_off" 
        });

        var topic = $"casa/comandos/{device.ExternalId}";
        await mqttService.PublishAsync(topic, commandPayload);

        device.IsOn = newState;
        await dbContext.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}