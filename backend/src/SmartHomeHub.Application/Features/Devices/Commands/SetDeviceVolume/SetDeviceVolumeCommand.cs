using FluentValidation;
using Mediator;
using Microsoft.EntityFrameworkCore;
using SmartHomeHub.Application.Common.Extensions;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Application.Features.Devices.Common;
using SmartHomeHub.Domain.Common.Exceptions;
using SmartHomeHub.Domain.Common.Primitives;
using SmartHomeHub.Domain.Enums;

namespace SmartHomeHub.Application.Features.Devices.Commands.SetDeviceVolume;

public record SetDeviceVolumeCommand(Guid DeviceId, string FirebaseUid, int VolumePercent)
    : ICommand<Result>;

public class SetDeviceVolumeCommandValidator : AbstractValidator<SetDeviceVolumeCommand>
{
    public SetDeviceVolumeCommandValidator()
    {
        RuleFor(command => command.DeviceId)
            .NotEmpty()
            .WithMessage("O ID do dispositivo é obrigatório.");

        RuleFor(command => command.FirebaseUid)
            .NotEmpty()
            .WithMessage("O identificador do usuário é obrigatório.");

        RuleFor(command => command.VolumePercent)
            .InclusiveBetween(0, 100)
            .WithMessage("O volume deve estar entre 0 e 100.");
    }
}

public class SetDeviceVolumeCommandHandler(
    IAppDbContext dbContext,
    IGoogleTvService googleTvService,
    IRealtimeNotificationService notificationService
) : ICommandHandler<SetDeviceVolumeCommand, Result>
{
    public async ValueTask<Result> Handle(
        SetDeviceVolumeCommand request,
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

        if (device.Type != DeviceType.Television || !device.IntegrationType.IsAdbControllable())
            return Result.Failure(
                new Error(
                    "Device.VolumeUnsupported",
                    "Este dispositivo não suporta controle de volume."
                )
            );

        var ipAddress = device.Configuration.IpAddress;

        if (string.IsNullOrEmpty(ipAddress))
            return Result.Failure(
                new Error(
                    "Device.NoIpAddress",
                    "A TV precisa de um IP configurado para receber comandos."
                )
            );

        try
        {
            await googleTvService.SetVolumePercentAsync(
                ipAddress,
                request.VolumePercent,
                cancellationToken
            );
        }
        catch (DeviceCommunicationException ex)
        {
            return Result.Failure(new Error(ex.Code, ex.Message));
        }

        var mediaInfo = await googleTvService.GetMediaSessionInfoAsync(
            ipAddress,
            cancellationToken
        );

        await notificationService.NotifyDeviceMediaChangedAsync(
            request.FirebaseUid,
            device.Id,
            new DeviceMediaStateDto(
                request.VolumePercent,
                mediaInfo?.IsPlaying ?? false,
                mediaInfo?.Title,
                mediaInfo?.Artist
            ),
            cancellationToken
        );

        return Result.Success();
    }
}
