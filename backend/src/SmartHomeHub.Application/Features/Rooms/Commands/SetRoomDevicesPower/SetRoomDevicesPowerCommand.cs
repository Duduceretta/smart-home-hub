using System.Diagnostics;
using FluentValidation;
using Mediator;
using Microsoft.EntityFrameworkCore;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Application.Features.Devices.Commands.SetDeviceState;
using SmartHomeHub.Domain.Common.Primitives;
using SmartHomeHub.Domain.Enums;

namespace SmartHomeHub.Application.Features.Rooms.Commands.SetRoomDevicesPower;

public record RoomBulkPowerResultDto(int SucceededCount, int FailedCount, int TotalCount);

public record SetRoomDevicesPowerCommand(Guid RoomId, string FirebaseUid, bool DesiredState)
    : ICommand<Result<RoomBulkPowerResultDto>>;

public class SetRoomDevicesPowerCommandValidator : AbstractValidator<SetRoomDevicesPowerCommand>
{
    public SetRoomDevicesPowerCommandValidator()
    {
        RuleFor(x => x.RoomId).NotEmpty().WithMessage("O ID do ambiente é obrigatório.");

        RuleFor(x => x.FirebaseUid)
            .NotEmpty()
            .WithMessage("O identificador do usuário é obrigatório.");
    }
}

/// <summary>
/// "Ligar Tudo"/"Desligar Tudo" do ambiente — dispara <see cref="SetDeviceStateCommand"/>
/// (mesmo comando do toggle individual, com toda a comunicação de hardware
/// TV/ADB/WoL/MQTT já centralizada lá) sequencialmente pra cada dispositivo
/// atuador elegível do ambiente, sem duplicar a lógica de dispositivo.
/// Sequencial, não em paralelo: todos os comandos aninhados compartilham o
/// mesmo <see cref="IAppDbContext"/> com escopo por requisição (via
/// <c>ISender</c>), e EF Core não é thread-safe — Task.WhenAll aqui gera
/// "A second operation was started on this context instance" quando dois
/// SetDeviceStateCommand tentam consultar/salvar ao mesmo tempo. Só
/// dispositivos online, do tipo atuador (Light/Switch/Thermostat/Lock/Alarm/
/// Television — Sensor/Camera são só leitura) e que já não estão no estado
/// desejado entram na leva, pelo mesmo motivo do SetDeviceStateCommand:
/// evitar desgaste físico/comando redundante em quem já está certo.
/// </summary>
public class SetRoomDevicesPowerCommandHandler(IAppDbContext dbContext, ISender sender)
    : ICommandHandler<SetRoomDevicesPowerCommand, Result<RoomBulkPowerResultDto>>
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

    public async ValueTask<Result<RoomBulkPowerResultDto>> Handle(
        SetRoomDevicesPowerCommand request,
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
            return Result.Failure<RoomBulkPowerResultDto>(
                new Error("User.NotFound", "Usuário não encontrado.")
            );

        var room = await dbContext
            .Rooms.AsNoTracking()
            .FirstOrDefaultAsync(
                room => room.Id == request.RoomId && room.UserId == user.Id,
                cancellationToken
            );

        if (room == null)
            return Result.Failure<RoomBulkPowerResultDto>(
                new Error("Room.NotFound", "Ambiente não encontrado ou sem permissão de acesso.")
            );

        var eligibleDeviceIds = await dbContext
            .Devices.AsNoTracking()
            .Include(d => d.LiveState)
            .Where(device =>
                device.RoomId == request.RoomId
                && device.UserId == user.Id
                && !device.IsDeleted
                && (device.LiveState != null ? device.LiveState.IsOnline : device.IsOnline)
                && ActuatorTypes.Contains(device.Type)
                && (device.LiveState != null ? device.LiveState.IsOn : device.IsOn)
                    != request.DesiredState
            )
            .Select(device => device.Id)
            .ToListAsync(cancellationToken);

        if (eligibleDeviceIds.Count == 0)
            return Result.Success(new RoomBulkPowerResultDto(0, 0, 0));

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
                    traceId
                ),
                cancellationToken
            );

            if (result.IsSuccess)
                succeededCount++;
            else
                failedCount++;
        }

        return Result.Success(
            new RoomBulkPowerResultDto(succeededCount, failedCount, eligibleDeviceIds.Count)
        );
    }
}
