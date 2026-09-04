using System.Diagnostics;
using FluentValidation;
using Mediator;
using Microsoft.EntityFrameworkCore;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Application.Features.Devices.Commands.SetDeviceState;
using SmartHomeHub.Domain.Common.Primitives;

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

// Endpoint mantém o contrato de "inverter estado" que o frontend já consome
// (POST /toggle sem body), mas toda a lógica de hardware (TV/ADB/WoL/MQTT) e
// persistência agora mora só em SetDeviceStateCommandHandler — este handler
// apenas lê o estado atual e delega o valor invertido, sem duplicar código.
public class ToggleDeviceCommandHandler(IAppDbContext dbContext, ISender sender)
    : ICommandHandler<ToggleDeviceCommand, Result>
{
    public async ValueTask<Result> Handle(
        ToggleDeviceCommand request,
        CancellationToken cancellationToken
    )
    {
        var device = await dbContext
            .Devices.AsNoTracking()
            .Include(d => d.LiveState)
            .FirstOrDefaultAsync(
                device =>
                    device.Id == request.DeviceId
                    && device.User.ExternalAuthUid == request.FirebaseUid,
                cancellationToken
            );

        if (device == null)
            return Result.Failure(
                new Error("Device.NotFound", "Dispositivo não encontrado ou sem permissão.")
            );

        var currentIsOn = device.LiveState != null ? device.LiveState.IsOn : device.IsOn;
        var traceId = Activity.Current?.Id ?? Guid.NewGuid().ToString();

        return await sender.Send(
            new SetDeviceStateCommand(request.DeviceId, request.FirebaseUid, !currentIsOn, traceId),
            cancellationToken
        );
    }
}
