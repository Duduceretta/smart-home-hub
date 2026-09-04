using FluentValidation;
using Mediator;
using Microsoft.EntityFrameworkCore;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Domain.Common.Primitives;
using SmartHomeHub.Domain.Entities;
using SmartHomeHub.Domain.Enums;
using SmartHomeHub.Domain.ValueObjects;

namespace SmartHomeHub.Application.Features.Devices.Commands.SetDeviceColor;

public record SetDeviceColorCommand(Guid DeviceId, string FirebaseUid, string ColorHex)
    : ICommand<Result>;

public class SetDeviceColorCommandValidator : AbstractValidator<SetDeviceColorCommand>
{
    public SetDeviceColorCommandValidator()
    {
        RuleFor(command => command.DeviceId)
            .NotEmpty()
            .WithMessage("O ID do dispositivo é obrigatório.");

        RuleFor(command => command.FirebaseUid)
            .NotEmpty()
            .WithMessage("O identificador do usuário é obrigatório.");

        RuleFor(command => command.ColorHex)
            .NotEmpty()
            .Matches("^#[0-9A-Fa-f]{6}$")
            .WithMessage("A cor deve estar no formato #RRGGBB.");
    }
}

public class SetDeviceColorCommandHandler(
    IAppDbContext dbContext,
    ITuyaLocalControlService tuyaLocalControlService
) : ICommandHandler<SetDeviceColorCommand, Result>
{
    public async ValueTask<Result> Handle(
        SetDeviceColorCommand request,
        CancellationToken cancellationToken
    )
    {
        var device = await dbContext
            .Devices.Include(d => d.LiveState)
            .FirstOrDefaultAsync(
                d => d.Id == request.DeviceId && d.User.ExternalAuthUid == request.FirebaseUid,
                cancellationToken
            );

        if (device == null)
            return Result.Failure(new Error("Device.NotFound", "Dispositivo não encontrado."));

        var liveState = device.LiveState;
        if (liveState == null)
        {
            liveState = new DeviceLiveState
            {
                DeviceId = device.Id,
                IsOn = false,
                IsOnline = false,
                LastSeenAt = null,
                Attributes = new DeviceLiveStateAttributes(),
            };
            device.LiveState = liveState;
            dbContext.DeviceLiveStates.Add(liveState);
        }

        if (device.Type != DeviceType.Light || device.IntegrationType != IntegrationType.TuyaLocal)
            return Result.Failure(
                new Error(
                    "Device.ColorUnsupported",
                    "Este dispositivo não suporta controle de cor."
                )
            );

        if (string.IsNullOrWhiteSpace(device.Configuration.LocalKey))
            return Result.Failure(
                new Error(
                    "Device.MissingConfiguration",
                    "O dispositivo Tuya não tem local_key configurada."
                )
            );

        var connection = new TuyaDeviceConnectionInfo(
            device.ExternalId,
            device.Configuration.LocalKey,
            device.Configuration.IpAddress,
            device.Configuration.DpsPowerKey,
            device.Configuration.ProtocolVersion,
            DpsColorKey: device.Configuration.DpsColorKey
        );

        var tuyaResult = await tuyaLocalControlService.SetColorAsync(
            connection,
            request.ColorHex,
            cancellationToken
        );

        if (tuyaResult.IsFailure)
            return Result.Failure(tuyaResult.Error);

        var outcome = tuyaResult.Value;

        if (outcome.ResolvedIpAddress is not null)
            device.Configuration.IpAddress = outcome.ResolvedIpAddress;

        if (outcome.ResolvedDpsColorKey is not null)
            device.Configuration.DpsColorKey = outcome.ResolvedDpsColorKey;

        // Detecção automática — só grava se o usuário nunca definiu o override
        // manual explicitamente (null). Ver comentário em DeviceConfiguration.cs.
        if (outcome.ResolvedSupportsColor == true && device.Configuration.SupportsColor is null)
            device.Configuration.SupportsColor = true;

        liveState.IsOnline = true;
        liveState.LastSeenAt = DateTimeOffset.UtcNow;
        liveState.Attributes.ColorHex = request.ColorHex;

        await dbContext.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}
