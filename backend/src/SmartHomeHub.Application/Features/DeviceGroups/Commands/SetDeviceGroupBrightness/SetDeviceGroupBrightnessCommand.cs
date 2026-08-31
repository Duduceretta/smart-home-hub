using FluentValidation;
using Mediator;
using Microsoft.EntityFrameworkCore;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Application.Features.Devices.Commands.SetDeviceBrightness;
using SmartHomeHub.Domain.Common.Primitives;
using SmartHomeHub.Domain.Enums;

namespace SmartHomeHub.Application.Features.DeviceGroups.Commands.SetDeviceGroupBrightness;

public record DeviceGroupBulkBrightnessResultDto(int SucceededCount, int FailedCount, int TotalCount);

public record SetDeviceGroupBrightnessCommand(
    Guid GroupId,
    string FirebaseUid,
    int BrightnessPercent
) : ICommand<Result<DeviceGroupBulkBrightnessResultDto>>;

public class SetDeviceGroupBrightnessCommandValidator
    : AbstractValidator<SetDeviceGroupBrightnessCommand>
{
    public SetDeviceGroupBrightnessCommandValidator()
    {
        RuleFor(x => x.GroupId).NotEmpty().WithMessage("O ID do grupo é obrigatório.");

        RuleFor(x => x.FirebaseUid)
            .NotEmpty()
            .WithMessage("O identificador do usuário é obrigatório.");

        RuleFor(x => x.BrightnessPercent)
            .InclusiveBetween(0, 100)
            .WithMessage("O brilho deve estar entre 0 e 100.");
    }
}

/// <summary>
/// Ajusta o nível de brilho (0-100%) para todas as lâmpadas online do grupo de dispositivos.
/// </summary>
public class SetDeviceGroupBrightnessCommandHandler(IAppDbContext dbContext, ISender sender)
    : ICommandHandler<SetDeviceGroupBrightnessCommand, Result<DeviceGroupBulkBrightnessResultDto>>
{
    public async ValueTask<Result<DeviceGroupBulkBrightnessResultDto>> Handle(
        SetDeviceGroupBrightnessCommand request,
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
            return Result.Failure<DeviceGroupBulkBrightnessResultDto>(
                new Error("User.NotFound", "Usuário não encontrado.")
            );

        var group = await dbContext
            .DeviceGroups.AsNoTracking()
            .FirstOrDefaultAsync(
                g => g.Id == request.GroupId && g.UserId == user.Id && !g.IsDeleted,
                cancellationToken
            );

        if (group == null)
            return Result.Failure<DeviceGroupBulkBrightnessResultDto>(
                new Error("DeviceGroup.NotFound", "Grupo de dispositivos não encontrado ou sem permissão de acesso.")
            );

        var lightDeviceIds = await dbContext
            .DeviceGroups.AsNoTracking()
            .Where(g => g.Id == request.GroupId && g.UserId == user.Id && !g.IsDeleted)
            .SelectMany(g => g.Devices)
            .Where(device =>
                !device.IsDeleted
                && device.IsOnline
                && device.Type == DeviceType.Light
            )
            .Select(device => device.Id)
            .ToListAsync(cancellationToken);

        if (lightDeviceIds.Count == 0)
            return Result.Success(new DeviceGroupBulkBrightnessResultDto(0, 0, 0));

        var succeededCount = 0;
        var failedCount = 0;

        foreach (var deviceId in lightDeviceIds)
        {
            var result = await sender.Send(
                new SetDeviceBrightnessCommand(
                    deviceId,
                    request.FirebaseUid,
                    request.BrightnessPercent
                ),
                cancellationToken
            );

            if (result.IsSuccess)
                succeededCount++;
            else
                failedCount++;
        }

        return Result.Success(
            new DeviceGroupBulkBrightnessResultDto(succeededCount, failedCount, lightDeviceIds.Count)
        );
    }
}
