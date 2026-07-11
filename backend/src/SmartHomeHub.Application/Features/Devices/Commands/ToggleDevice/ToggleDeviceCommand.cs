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
    IMqttService mqttService
// IGoogleTvService googleTvService -> Adicionaremos na próxima etapa!
) : ICommandHandler<ToggleDeviceCommand, Result>
{
    public async ValueTask<Result> Handle(
        ToggleDeviceCommand request,
        CancellationToken cancellationToken
    )
    {
        var user = await dbContext
            .Users.AsNoTracking()
            .FirstOrDefaultAsync(u => u.ExternalAuthUid == request.FirebaseUid, cancellationToken);
        if (user == null)
            return Result.Failure(new Error("User.NotFound", "Usuário não encontrado."));

        var device = await dbContext.Devices.FirstOrDefaultAsync(
            d => d.Id == request.DeviceId && d.UserId == user.Id,
            cancellationToken
        );
        if (device == null)
            return Result.Failure(
                new Error("Device.NotFound", "Dispositivo não encontrado ou sem permissão.")
            );

        var newState = !device.IsOn;

        // 🚀 TRILHO DE TREM (ROTEAMENTO DE PROTOCOLOS)
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
                // TV estava desligada -> Envia Wake-on-LAN pelo MAC
                // await googleTvService.WakeUpAsync(device.ExternalId, cancellationToken);
            }
            else
            {
                // TV estava ligada -> Envia Keycode Power pelo ADB via IP
                // await googleTvService.SendKeycodeAsync(device.IpAddress, 26, cancellationToken);
            }
        }
        else
        {
            // PADRÃO PARA DISPOSITIVOS MQTT (Sonoff, Lâmpadas, etc)
            var commandPayload = JsonSerializer.Serialize(
                new { action = newState ? "turn_on" : "turn_off" }
            );
            var topic = $"casa/comandos/{device.ExternalId}";
            await mqttService.PublishAsync(topic, commandPayload);
        }

        // Salva o novo estado no banco
        device.IsOn = newState;
        await dbContext.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}
