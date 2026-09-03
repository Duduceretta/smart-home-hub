using FluentValidation;
using Mediator;
using Microsoft.EntityFrameworkCore;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Domain.Common.Primitives;
using SmartHomeHub.Domain.Enums;

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
        var device = await dbContext.Devices.FirstOrDefaultAsync(
            d => d.Id == request.DeviceId && d.User.ExternalAuthUid == request.FirebaseUid,
            cancellationToken
        );

        if (device == null)
            return Result.Failure(new Error("Device.NotFound", "Dispositivo não encontrado."));

        if (device.Type != DeviceType.Light || device.IntegrationType != IntegrationType.TuyaLocal)
            return Result.Failure(
                new Error(
                    "Device.BrightnessUnsupported",
                    "Este dispositivo não suporta controle de brilho."
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
            device.Configuration.DpsBrightnessKey
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
            device.Configuration.IpAddress = outcome.ResolvedIpAddress;

        if (outcome.ResolvedDpsBrightnessKey is not null)
            device.Configuration.DpsBrightnessKey = outcome.ResolvedDpsBrightnessKey;

        device.IsOnline = true;
        device.LastSeenAt = DateTimeOffset.UtcNow;
        device.Brightness = request.BrightnessPercent;

        await dbContext.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}
