using FluentValidation;
using Mediator;
using Microsoft.EntityFrameworkCore;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Domain.Common.Primitives;
using SmartHomeHub.Domain.Entities;
using SmartHomeHub.Domain.Enums;
using SmartHomeHub.Domain.ValueObjects;

namespace SmartHomeHub.Application.Features.Devices.Commands.SetDeviceBrightness;

public record SetDeviceBrightnessCommand(Guid DeviceId, string FirebaseUid, int BrightnessPercent)
    : ICommand<Result>;

public class SetDeviceBrightnessCommandValidator : AbstractValidator<SetDeviceBrightnessCommand>
{
    public SetDeviceBrightnessCommandValidator()
    {
        RuleFor(command => command.DeviceId)
            .NotEmpty()
            .WithMessage("O ID do dispositivo é obrigatório.");

        RuleFor(command => command.FirebaseUid)
            .NotEmpty()
            .WithMessage("O identificador do usuário é obrigatório.");

        RuleFor(command => command.BrightnessPercent)
            .InclusiveBetween(0, 100)
            .WithMessage("O brilho deve estar entre 0 e 100.");
    }
}

public class SetDeviceBrightnessCommandHandler(
    IAppDbContext dbContext,
    ITuyaLocalControlService tuyaLocalControlService
) : ICommandHandler<SetDeviceBrightnessCommand, Result>
{
    public async ValueTask<Result> Handle(
        SetDeviceBrightnessCommand request,
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
                    "Device.BrightnessUnsupported",
                    "Este dispositivo não suporta controle de brilho."
                )
            );

        if (device.Configuration is not TuyaDeviceConfiguration tuyaConfig)
            throw new InvalidOperationException(
                $"Dispositivo {device.Id} tem IntegrationType=TuyaLocal mas Configuration é {device.Configuration.GetType().Name}."
            );

        if (string.IsNullOrWhiteSpace(tuyaConfig.LocalKey))
            return Result.Failure(
                new Error(
                    "Device.MissingConfiguration",
                    "O dispositivo Tuya não tem local_key configurada."
                )
            );

        var connection = new TuyaDeviceConnectionInfo(
            device.ExternalId,
            tuyaConfig.LocalKey,
            tuyaConfig.IpAddress,
            tuyaConfig.DpsPowerKey,
            tuyaConfig.ProtocolVersion,
            tuyaConfig.DpsBrightnessKey
        );

        var tuyaResult = await tuyaLocalControlService.SetBrightnessAsync(
            connection,
            request.BrightnessPercent,
            cancellationToken
        );

        if (tuyaResult.IsFailure)
            return Result.Failure(tuyaResult.Error);

        var outcome = tuyaResult.Value;

        if (outcome.ResolvedIpAddress is not null)
            tuyaConfig.IpAddress = outcome.ResolvedIpAddress;

        if (outcome.ResolvedDpsBrightnessKey is not null)
            tuyaConfig.DpsBrightnessKey = outcome.ResolvedDpsBrightnessKey;

        liveState.IsOnline = true;
        liveState.LastSeenAt = DateTimeOffset.UtcNow;
        liveState.Attributes.Brightness = request.BrightnessPercent;

        await dbContext.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}
