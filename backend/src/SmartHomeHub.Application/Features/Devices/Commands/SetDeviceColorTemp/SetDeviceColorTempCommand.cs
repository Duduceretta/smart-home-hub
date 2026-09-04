using FluentValidation;
using Mediator;
using Microsoft.EntityFrameworkCore;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Domain.Common.Primitives;
using SmartHomeHub.Domain.Entities;
using SmartHomeHub.Domain.Enums;
using SmartHomeHub.Domain.ValueObjects;

namespace SmartHomeHub.Application.Features.Devices.Commands.SetDeviceColorTemp;

public record SetDeviceColorTempCommand(Guid DeviceId, string FirebaseUid, int ColorTempPercent)
    : ICommand<Result>;

public class SetDeviceColorTempCommandValidator : AbstractValidator<SetDeviceColorTempCommand>
{
    public SetDeviceColorTempCommandValidator()
    {
        RuleFor(command => command.DeviceId)
            .NotEmpty()
            .WithMessage("O ID do dispositivo é obrigatório.");

        RuleFor(command => command.FirebaseUid)
            .NotEmpty()
            .WithMessage("O identificador do usuário é obrigatório.");

        RuleFor(command => command.ColorTempPercent)
            .InclusiveBetween(0, 100)
            .WithMessage("A temperatura de cor deve estar entre 0 e 100.");
    }
}

public class SetDeviceColorTempCommandHandler(
    IAppDbContext dbContext,
    ITuyaLocalControlService tuyaLocalControlService
) : ICommandHandler<SetDeviceColorTempCommand, Result>
{
    public async ValueTask<Result> Handle(
        SetDeviceColorTempCommand request,
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
                IsOn = device.IsOn,
                IsOnline = device.IsOnline,
                LastSeenAt = device.LastSeenAt,
                Attributes = new DeviceLiveStateAttributes
                {
                    Brightness = device.Brightness,
                    ColorHex = device.ColorHex,
                    ColorTempPercent = device.ColorTempPercent,
                },
            };
            device.LiveState = liveState;
            dbContext.DeviceLiveStates.Add(liveState);
        }

        if (device.Type != DeviceType.Light || device.IntegrationType != IntegrationType.TuyaLocal)
            return Result.Failure(
                new Error(
                    "Device.ColorTempUnsupported",
                    "Este dispositivo não suporta controle de temperatura de cor."
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
            DpsColorTempKey: device.Configuration.DpsColorTempKey
        );

        var tuyaResult = await tuyaLocalControlService.SetColorTempAsync(
            connection,
            request.ColorTempPercent,
            cancellationToken
        );

        if (tuyaResult.IsFailure)
            return Result.Failure(tuyaResult.Error);

        var outcome = tuyaResult.Value;

        if (outcome.ResolvedIpAddress is not null)
            device.Configuration.IpAddress = outcome.ResolvedIpAddress;

        if (outcome.ResolvedDpsColorTempKey is not null)
            device.Configuration.DpsColorTempKey = outcome.ResolvedDpsColorTempKey;

        liveState.IsOnline = true;
        liveState.LastSeenAt = DateTimeOffset.UtcNow;
        liveState.Attributes.ColorTempPercent = request.ColorTempPercent;

        await dbContext.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}
