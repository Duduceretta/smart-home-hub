using System.Text.Json;
using FluentValidation;
using Mediator;
using Microsoft.EntityFrameworkCore;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Domain.Common.Primitives;
using SmartHomeHub.Domain.Enums;

namespace SmartHomeHub.Application.Features.Devices.Commands.ToggleDevice;

public record ToggleDeviceCommand(Guid DeviceId, string FirebaseUid) : ICommand<Result>;

public class ToggleDeviceCommandValidator : AbstractValidator<ToggleDeviceCommand>
{
    public ToggleDeviceCommandValidator()
    {
        RuleFor(command => command.DeviceId)
            .NotEmpty()
            .WithMessage("O ID do dispositivo é obrigatório.");

        RuleFor(command => command.FirebaseUid)
            .NotEmpty()
            .WithMessage("O identificador do usuário é obrigatório.");
    }
}

public class ToggleDeviceCommandHandler(
    IAppDbContext dbContext,
    IMqttService mqttService,
    IGoogleTvService googleTvService,
    IChromecastWakeService chromecastWakeService,
    IRealtimeNotificationService notificationService
) : ICommandHandler<ToggleDeviceCommand, Result>
{
    public async ValueTask<Result> Handle(
        ToggleDeviceCommand request,
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

        var device = await dbContext.Devices.FirstOrDefaultAsync(
            device => device.Id == request.DeviceId && device.UserId == user.Id,
            cancellationToken
        );

        if (device == null)
            return Result.Failure(
                new Error("Device.NotFound", "Dispositivo não encontrado ou sem permissão.")
            );

        var newState = !device.IsOn;

        if (device.Type == DeviceType.Television)
        {
            if (string.IsNullOrEmpty(device.IpAddress))
                return Result.Failure(
                    new Error(
                        "Device.NoIpAddress",
                        "A TV precisa de um IP configurado para receber comandos."
                    )
                );

            if (newState)
            {
                await chromecastWakeService.WakeUpAsync(device.IpAddress, cancellationToken);

                await Task.Delay(2000, cancellationToken);
            }
            else
            {
                await googleTvService.SendKeycodeAsync(device.IpAddress, 26, cancellationToken);
            }
        }
        else
        {
            var commandPayload = JsonSerializer.Serialize(
                new { action = newState ? "turn_on" : "turn_off" }
            );
            var topic = $"casa/comandos/{device.ExternalId}";
            await mqttService.PublishAsync(topic, commandPayload);
        }

        device.IsOn = newState;
        await dbContext.SaveChangesAsync(cancellationToken);

        await notificationService.NotifyDeviceStatusChangedAsync(
            request.FirebaseUid,
            device.Id,
            device.IsOn,
            device.IsOnline,
            cancellationToken
        );

        return Result.Success();
    }
}
