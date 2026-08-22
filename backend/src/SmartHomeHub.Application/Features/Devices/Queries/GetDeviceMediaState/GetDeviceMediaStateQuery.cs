using FluentValidation;
using Mediator;
using Microsoft.EntityFrameworkCore;
using SmartHomeHub.Application.Common.Extensions;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Application.Features.Devices.Common;
using SmartHomeHub.Domain.Common.Primitives;
using SmartHomeHub.Domain.Enums;

namespace SmartHomeHub.Application.Features.Devices.Queries.GetDeviceMediaState;

public record GetDeviceMediaStateQuery(Guid DeviceId, string FirebaseUid)
    : IQuery<Result<DeviceMediaStateDto>>;

public class GetDeviceMediaStateQueryValidator : AbstractValidator<GetDeviceMediaStateQuery>
{
    public GetDeviceMediaStateQueryValidator()
    {
        RuleFor(query => query.DeviceId).NotEmpty().WithMessage("O ID do dispositivo é obrigatório.");

        RuleFor(query => query.FirebaseUid)
            .NotEmpty()
            .WithMessage("O identificador do usuário é obrigatório.");
    }
}

public class GetDeviceMediaStateQueryHandler(
    IAppDbContext dbContext,
    IGoogleTvService googleTvService
) : IQueryHandler<GetDeviceMediaStateQuery, Result<DeviceMediaStateDto>>
{
    public async ValueTask<Result<DeviceMediaStateDto>> Handle(
        GetDeviceMediaStateQuery request,
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
            return Result.Failure<DeviceMediaStateDto>(
                new Error("User.NotFound", "Usuário não encontrado.")
            );

        var device = await dbContext
            .Devices.AsNoTracking()
            .FirstOrDefaultAsync(
                device => device.Id == request.DeviceId && device.UserId == user.Id,
                cancellationToken
            );

        if (device == null)
            return Result.Failure<DeviceMediaStateDto>(
                new Error(
                    "Device.NotFound",
                    "Dispositivo não encontrado ou sem permissão de acesso."
                )
            );

        if (device.Type != DeviceType.Television || !device.IntegrationType.IsAdbControllable())
            return Result.Failure<DeviceMediaStateDto>(
                new Error(
                    "Device.VolumeUnsupported",
                    "Este dispositivo não suporta consulta de mídia/volume."
                )
            );

        var ipAddress = device.Configuration.IpAddress;

        if (string.IsNullOrEmpty(ipAddress))
            return Result.Failure<DeviceMediaStateDto>(
                new Error(
                    "Device.NoIpAddress",
                    "A TV precisa de um IP configurado para receber comandos."
                )
            );

        var volumeTask = googleTvService.GetVolumePercentAsync(ipAddress, cancellationToken);
        var mediaTask = googleTvService.GetMediaSessionInfoAsync(ipAddress, cancellationToken);

        await Task.WhenAll(volumeTask, mediaTask);

        var media = mediaTask.Result;

        return Result.Success(
            new DeviceMediaStateDto(volumeTask.Result, media?.IsPlaying ?? false, media?.Title, media?.Artist)
        );
    }
}
