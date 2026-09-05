using System.Diagnostics;
using FluentValidation;
using Mediator;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Application.Features.Devices.Commands.SetDeviceState;
using SmartHomeHub.Domain.Common.Primitives;
using SmartHomeHub.Domain.Entities;
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
/// <remarks>
/// O fan-out para os dispositivos é paralelo, mas cada disparo roda em um
/// <see cref="IServiceScope"/> próprio (via <see cref="IServiceScopeFactory"/>), com seu
/// próprio <see cref="IAppDbContext"/> isolado. Não dá pra usar <c>Task.WhenAll</c> direto
/// sobre um <see cref="ISender"/> resolvido no escopo da requisição: todos os
/// <see cref="Application.Features.Devices.Commands.SetDeviceState.SetDeviceStateCommand"/>
/// aninhados compartilhariam o mesmo DbContext, e EF Core não é thread-safe — duas operações
/// concorrentes na mesma instância estouram "A second operation was started on this context
/// instance". Um scope por dispositivo resolve isso sem perder o paralelismo.
/// </remarks>
public class SetDeviceGroupPowerCommandHandler(
    IAppDbContext dbContext,
    IServiceScopeFactory scopeFactory
) : ICommandHandler<SetDeviceGroupPowerCommand, Result<DeviceGroupBulkPowerResultDto>>
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
                new Error(
                    "DeviceGroup.NotFound",
                    "Grupo de dispositivos não encontrado ou sem permissão de acesso."
                )
            );

        var eligibleDeviceIds = await dbContext
            .DeviceGroups.AsNoTracking()
            .Where(g => g.Id == request.GroupId && g.UserId == user.Id && !g.IsDeleted)
            .SelectMany(g => g.Devices)
            .Where(device =>
                !device.IsDeleted
                && device.LiveState != null
                && device.LiveState.IsOnline
                && ActuatorTypes.Contains(device.Type)
                && device.LiveState.IsOn != request.DesiredState
            )
            .Select(device => device.Id)
            .ToListAsync(cancellationToken);

        if (eligibleDeviceIds.Count == 0)
            return Result.Success(new DeviceGroupBulkPowerResultDto(0, 0, 0));

        var traceId = Activity.Current?.Id ?? Guid.NewGuid().ToString();

        var outcomes = await Task.WhenAll(
            eligibleDeviceIds.Select(deviceId =>
                DispatchInIsolatedScopeAsync(deviceId, request, group, traceId, cancellationToken)
            )
        );

        var succeededCount = outcomes.Count(succeeded => succeeded);
        var failedCount = outcomes.Length - succeededCount;

        return Result.Success(
            new DeviceGroupBulkPowerResultDto(succeededCount, failedCount, eligibleDeviceIds.Count)
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
        SetDeviceGroupPowerCommand request,
        DeviceGroup group,
        string traceId,
        CancellationToken cancellationToken
    )
    {
        await using var scope = scopeFactory.CreateAsyncScope();
        var scopedSender = scope.ServiceProvider.GetRequiredService<ISender>();

        var result = await scopedSender.Send(
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

        return result.IsSuccess;
    }
}
