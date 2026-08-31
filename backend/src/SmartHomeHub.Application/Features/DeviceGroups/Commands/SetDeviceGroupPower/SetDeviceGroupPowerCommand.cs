using System.Diagnostics;
using FluentValidation;
using Mediator;
using Microsoft.EntityFrameworkCore;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Application.Features.Devices.Commands.SetDeviceState;
using SmartHomeHub.Domain.Common.Primitives;
using SmartHomeHub.Domain.Enums;

namespace SmartHomeHub.Application.Features.DeviceGroups.Commands.SetDeviceGroupPower;

public record DeviceGroupBulkPowerResultDto(int SucceededCount, int FailedCount, int TotalCount);

public record SetDeviceGroupPowerCommand(Guid GroupId, string FirebaseUid, bool DesiredState)
    : ICommand<Result<DeviceGroupBulkPowerResultDto>>;

public class SetDeviceGroupPowerCommandValidator : AbstractValidator<SetDeviceGroupPowerCommand>
{
    public SetDeviceGroupPowerCommandValidator()
    {
        RuleFor(x => x.GroupId).NotEmpty().WithMessage("O ID do grupo é obrigatório.");

        RuleFor(x => x.FirebaseUid)
            .NotEmpty()
            .WithMessage("O identificador do usuário é obrigatório.");
    }
}

/// <summary>
/// Executa "Ligar Tudo" ou "Desligar Tudo" para todos os dispositivos atuadores elegíveis
/// pertencentes ao grupo de dispositivos especificado.
/// </summary>
public class SetDeviceGroupPowerCommandHandler(IAppDbContext dbContext, ISender sender)
    : ICommandHandler<SetDeviceGroupPowerCommand, Result<DeviceGroupBulkPowerResultDto>>
{
    private static readonly HashSet<DeviceType> ActuatorTypes =
    [
        DeviceType.Light,
        DeviceType.Switch,
        DeviceType.Thermostat,
        DeviceType.Lock,
        DeviceType.Alarm,
        DeviceType.Television,
    ];

    public async ValueTask<Result<DeviceGroupBulkPowerResultDto>> Handle(
        SetDeviceGroupPowerCommand request,
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
            return Result.Failure<DeviceGroupBulkPowerResultDto>(
                new Error("User.NotFound", "Usuário não encontrado.")
            );

        var group = await dbContext
            .DeviceGroups.AsNoTracking()
            .FirstOrDefaultAsync(
                g => g.Id == request.GroupId && g.UserId == user.Id && !g.IsDeleted,
                cancellationToken
            );

        if (group == null)
            return Result.Failure<DeviceGroupBulkPowerResultDto>(
                new Error("DeviceGroup.NotFound", "Grupo de dispositivos não encontrado ou sem permissão de acesso.")
            );

        var eligibleDeviceIds = await dbContext
            .DeviceGroups.AsNoTracking()
            .Where(g => g.Id == request.GroupId && g.UserId == user.Id && !g.IsDeleted)
            .SelectMany(g => g.Devices)
            .Where(device =>
                !device.IsDeleted
                && device.IsOnline
                && ActuatorTypes.Contains(device.Type)
                && device.IsOn != request.DesiredState
            )
            .Select(device => device.Id)
            .ToListAsync(cancellationToken);

        if (eligibleDeviceIds.Count == 0)
            return Result.Success(new DeviceGroupBulkPowerResultDto(0, 0, 0));

        var traceId = Activity.Current?.Id ?? Guid.NewGuid().ToString();
        var succeededCount = 0;
        var failedCount = 0;

        foreach (var deviceId in eligibleDeviceIds)
        {
            var result = await sender.Send(
                new SetDeviceStateCommand(
                    deviceId,
                    request.FirebaseUid,
                    request.DesiredState,
                    traceId,
                    EventSource.DeviceGroup,
                    group.Id,
                    group.Name
                ),
                cancellationToken
            );

            if (result.IsSuccess)
                succeededCount++;
            else
                failedCount++;
        }

        return Result.Success(
            new DeviceGroupBulkPowerResultDto(succeededCount, failedCount, eligibleDeviceIds.Count)
        );
    }
}
