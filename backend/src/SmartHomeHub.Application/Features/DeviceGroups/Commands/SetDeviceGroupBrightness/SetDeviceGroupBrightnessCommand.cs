using FluentValidation;
using Mediator;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Application.Features.Devices.Commands.SetDeviceBrightness;
using SmartHomeHub.Domain.Common.Primitives;
using SmartHomeHub.Domain.Enums;

namespace SmartHomeHub.Application.Features.DeviceGroups.Commands.SetDeviceGroupBrightness;

public record DeviceGroupBulkBrightnessResultDto(
    int SucceededCount,
    int FailedCount,
    int TotalCount
);

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
/// <remarks>
/// O fan-out para os dispositivos é paralelo, mas cada disparo roda em um
/// <see cref="IServiceScope"/> próprio (via <see cref="IServiceScopeFactory"/>), com seu
/// próprio <see cref="IAppDbContext"/> isolado. Não dá pra usar <c>Task.WhenAll</c> direto
/// sobre um <see cref="ISender"/> resolvido no escopo da requisição: todos os
/// <see cref="Application.Features.Devices.Commands.SetDeviceBrightness.SetDeviceBrightnessCommand"/>
/// aninhados compartilhariam o mesmo DbContext, e EF Core não é thread-safe — duas operações
/// concorrentes na mesma instância estouram "A second operation was started on this context
/// instance". Um scope por dispositivo resolve isso sem perder o paralelismo.
/// </remarks>
public class SetDeviceGroupBrightnessCommandHandler(
    IAppDbContext dbContext,
    IServiceScopeFactory scopeFactory
) : ICommandHandler<SetDeviceGroupBrightnessCommand, Result<DeviceGroupBulkBrightnessResultDto>>
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
                new Error(
                    "DeviceGroup.NotFound",
                    "Grupo de dispositivos não encontrado ou sem permissão de acesso."
                )
            );

        var lightDeviceIds = await dbContext
            .DeviceGroups.AsNoTracking()
            .Where(g => g.Id == request.GroupId && g.UserId == user.Id && !g.IsDeleted)
            .SelectMany(g => g.Devices)
            .Where(device =>
                !device.IsDeleted
                && device.LiveState != null
                && device.LiveState.IsOnline
                && device.Type == DeviceType.Light
            )
            .Select(device => device.Id)
            .ToListAsync(cancellationToken);

        if (lightDeviceIds.Count == 0)
            return Result.Success(new DeviceGroupBulkBrightnessResultDto(0, 0, 0));

        var outcomes = await Task.WhenAll(
            lightDeviceIds.Select(deviceId =>
                DispatchInIsolatedScopeAsync(deviceId, request, cancellationToken)
            )
        );

        var succeededCount = outcomes.Count(succeeded => succeeded);
        var failedCount = outcomes.Length - succeededCount;

        return Result.Success(
            new DeviceGroupBulkBrightnessResultDto(
                succeededCount,
                failedCount,
                lightDeviceIds.Count
            )
        );
    }

    /// <summary>
    /// Executa um <see cref="SetDeviceBrightnessCommand"/> isolado, em seu próprio
    /// <see cref="IServiceScope"/>/<see cref="IAppDbContext"/> — permite rodar N dispositivos
    /// em paralelo sem violar a regra de thread-safety do EF Core. O escopo é sempre
    /// descartado ao final, mesmo em caso de falha de negócio ou exceção.
    /// </summary>
    private async Task<bool> DispatchInIsolatedScopeAsync(
        Guid deviceId,
        SetDeviceGroupBrightnessCommand request,
        CancellationToken cancellationToken
    )
    {
        await using var scope = scopeFactory.CreateAsyncScope();
        var scopedSender = scope.ServiceProvider.GetRequiredService<ISender>();

        var result = await scopedSender.Send(
            new SetDeviceBrightnessCommand(
                deviceId,
                request.FirebaseUid,
                request.BrightnessPercent
            ),
            cancellationToken
        );

        return result.IsSuccess;
    }
}
