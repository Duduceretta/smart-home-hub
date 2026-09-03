using FluentValidation;
using Mediator;
using Microsoft.EntityFrameworkCore;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Domain.Common.Primitives;
using SmartHomeHub.Domain.Enums;

namespace SmartHomeHub.Application.Features.Devices.Commands.SetDeviceWorkMode;

/// <summary>
/// Troca as abas "Branco"/"Cor" no front-end — é uma mudança real de DP no
/// dispositivo (work_mode), não só estado de UI, espelhando o app Smart Life.
/// </summary>
public record SetDeviceWorkModeCommand(Guid DeviceId, string FirebaseUid, string WorkMode)
    : ICommand<Result>;

public class SetDeviceWorkModeCommandValidator : AbstractValidator<SetDeviceWorkModeCommand>
{
    public SetDeviceWorkModeCommandValidator()
    {
        RuleFor(command => command.DeviceId)
            .NotEmpty()
            .WithMessage("O ID do dispositivo é obrigatório.");

        RuleFor(command => command.FirebaseUid)
            .NotEmpty()
            .WithMessage("O identificador do usuário é obrigatório.");

        RuleFor(command => command.WorkMode)
            .Must(mode => mode is "white" or "colour")
            .WithMessage("O modo deve ser 'white' ou 'colour'.");
    }
}

public class SetDeviceWorkModeCommandHandler(
    IAppDbContext dbContext,
    ITuyaLocalControlService tuyaLocalControlService
) : ICommandHandler<SetDeviceWorkModeCommand, Result>
{
    public async ValueTask<Result> Handle(
        SetDeviceWorkModeCommand request,
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
                    "Device.WorkModeUnsupported",
                    "Este dispositivo não suporta troca de modo."
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
            device.Configuration.ProtocolVersion
        );

        var tuyaResult = await tuyaLocalControlService.SetWorkModeAsync(
            connection,
            request.WorkMode,
            cancellationToken
        );

        if (tuyaResult.IsFailure)
            return Result.Failure(tuyaResult.Error);

        if (tuyaResult.Value.ResolvedIpAddress is not null)
            device.Configuration.IpAddress = tuyaResult.Value.ResolvedIpAddress;

        device.IsOnline = true;
        device.LastSeenAt = DateTimeOffset.UtcNow;

        await dbContext.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}
