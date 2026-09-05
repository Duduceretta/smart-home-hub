using System.Diagnostics;
using FluentValidation;
using Mediator;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
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
/// TV/ADB/WoL/MQTT já centralizada lá) pra cada dispositivo atuador elegível do
/// ambiente, sem duplicar a lógica de dispositivo. Só dispositivos online, do tipo
/// atuador (Light/Switch/Thermostat/Lock/Alarm/Television — Sensor/Camera são só
/// leitura) e que já não estão no estado desejado entram na leva, pelo mesmo motivo
/// do SetDeviceStateCommand: evitar desgaste físico/comando redundante em quem já
/// está certo.
/// </summary>
/// <remarks>
/// O fan-out é paralelo, mas cada disparo roda em um <see cref="IServiceScope"/> próprio
/// (via <see cref="IServiceScopeFactory"/>), com seu próprio <see cref="IAppDbContext"/>
/// isolado. Não dá pra usar <c>Task.WhenAll</c> direto sobre um <see cref="ISender"/>
/// resolvido no escopo da requisição: todos os <see cref="SetDeviceStateCommand"/>
/// aninhados compartilhariam o mesmo DbContext, e EF Core não é thread-safe — duas
/// operações concorrentes na mesma instância estouram "A second operation was started
/// on this context instance". Um scope por dispositivo resolve isso sem perder o
/// paralelismo (era o motivo pelo qual essa dispatch ficava sequencial antes).
/// </remarks>
public class SetRoomDevicesPowerCommandHandler(
    IAppDbContext dbContext,
    IServiceScopeFactory scopeFactory
) : ICommandHandler<SetRoomDevicesPowerCommand, Result<RoomBulkPowerResultDto>>
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
                && device.LiveState != null
                && device.LiveState.IsOnline
                && ActuatorTypes.Contains(device.Type)
                && device.LiveState.IsOn != request.DesiredState
            )
            .Select(device => device.Id)
            .ToListAsync(cancellationToken);

        if (eligibleDeviceIds.Count == 0)
            return Result.Success(new RoomBulkPowerResultDto(0, 0, 0));

        var traceId = Activity.Current?.Id ?? Guid.NewGuid().ToString();

        var outcomes = await Task.WhenAll(
            eligibleDeviceIds.Select(deviceId =>
                DispatchInIsolatedScopeAsync(deviceId, request, traceId, cancellationToken)
            )
        );

        var succeededCount = outcomes.Count(succeeded => succeeded);
        var failedCount = outcomes.Length - succeededCount;

        return Result.Success(
            new RoomBulkPowerResultDto(succeededCount, failedCount, eligibleDeviceIds.Count)
        );
    }

    /// <summary>
    /// Executa um <see cref="SetDeviceStateCommand"/> isolado, em seu próprio
    /// <see cref="IServiceScope"/>/<see cref="IAppDbContext"/> — permite rodar N dispositivos
    /// em paralelo sem violar a regra de thread-safety do EF Core. O escopo é sempre
    /// descartado ao final, mesmo em caso de falha de negócio ou exceção.
    /// </summary>
    private async Task<bool> DispatchInIsolatedScopeAsync(
        Guid deviceId,
        SetRoomDevicesPowerCommand request,
        string traceId,
        CancellationToken cancellationToken
    )
    {
        await using var scope = scopeFactory.CreateAsyncScope();
        var scopedSender = scope.ServiceProvider.GetRequiredService<ISender>();

        var result = await scopedSender.Send(
            new SetDeviceStateCommand(deviceId, request.FirebaseUid, request.DesiredState, traceId),
            cancellationToken
        );

        return result.IsSuccess;
    }
}
