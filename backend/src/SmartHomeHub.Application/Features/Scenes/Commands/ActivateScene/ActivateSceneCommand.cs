using System.Diagnostics;
using System.Text.Json.Serialization;
using Mediator;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Application.Features.Dashboards.ActivityLog;
using SmartHomeHub.Application.Features.Devices.Commands.SetDeviceBrightness;
using SmartHomeHub.Application.Features.Devices.Commands.SetDeviceColor;
using SmartHomeHub.Application.Features.Devices.Commands.SetDeviceColorTemp;
using SmartHomeHub.Application.Features.Devices.Commands.SetDeviceState;
using SmartHomeHub.Domain.Common.Constants;
using SmartHomeHub.Domain.Common.Primitives;
using SmartHomeHub.Domain.Entities;
using SmartHomeHub.Domain.Enums;

namespace SmartHomeHub.Application.Features.Scenes.Commands.ActivateScene;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum SceneActivationItemStatus
{
    Applied,
    Failed,
    Skipped,
}

public record SceneActivationItemResultDto(
    Guid DeviceId,
    string DeviceName,
    SceneActivationItemStatus Status,
    string? Reason
);

public record SceneActivationResultDto(
    Guid SceneId,
    string SceneName,
    int AppliedCount,
    int FailedCount,
    int SkippedCount,
    List<SceneActivationItemResultDto> Items
);

public record ActivateSceneCommand(Guid SceneId, string FirebaseUid)
    : ICommand<Result<SceneActivationResultDto>>;

/// <summary>
/// Aplica o estado desejado de cada dispositivo da cena. Não é transacional: dispositivo
/// offline é pulado, falha em um não aborta os outros, e o resultado devolve o desfecho por
/// dispositivo. O estado real confirmado chega ao cliente pelos eventos SignalR que os
/// próprios comandos de dispositivo já emitem.
/// </summary>
/// <remarks>
/// Mesmo desenho de <c>SetDeviceGroupPowerCommandHandler</c>: o fan-out é paralelo, mas
/// cada dispositivo roda em um <see cref="IServiceScope"/> próprio (com seu próprio
/// <see cref="IAppDbContext"/>), porque o EF Core não é thread-safe e N comandos
/// aninhados compartilhando o DbContext da requisição estourariam "A second operation
/// was started on this context instance". Dentro de um mesmo dispositivo os comandos
/// são sequenciais (ligar antes de ajustar brilho/cor).
/// </remarks>
public class ActivateSceneCommandHandler(IAppDbContext dbContext, IServiceScopeFactory scopeFactory)
    : ICommandHandler<ActivateSceneCommand, Result<SceneActivationResultDto>>
{
    private sealed record ItemSnapshot(
        Guid DeviceId,
        string DeviceName,
        bool IsOnline,
        bool IsOn,
        int? Brightness,
        string? ColorHex,
        int? ColorTempPercent
    );

    public async ValueTask<Result<SceneActivationResultDto>> Handle(
        ActivateSceneCommand request,
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
            return Result.Failure<SceneActivationResultDto>(
                new Error("User.NotFound", "Usuário não encontrado.")
            );

        var scene = await dbContext
            .Scenes.Include(scene => scene.Items)
                .ThenInclude(item => item.Device)
                    .ThenInclude(device => device.LiveState)
            .FirstOrDefaultAsync(
                scene => scene.Id == request.SceneId && scene.UserId == user.Id,
                cancellationToken
            );

        if (scene == null)
            return Result.Failure<SceneActivationResultDto>(
                new Error("Scene.NotFound", "Cena não encontrada ou sem permissão de acesso.")
            );

        // Cena vazia (o último dispositivo foi apagado): não há o que aplicar. Recusa em vez de
        // devolver 200 com 0 itens e gravar um evento "0 de 0" no histórico.
        if (scene.Items.Count == 0)
            return Result.Failure<SceneActivationResultDto>(
                new Error(
                    "Scene.Validation.NoDevices",
                    "A cena não tem dispositivos. Adicione ao menos um para ativá-la."
                )
            );

        var snapshots = scene
            .Items.Select(item => new ItemSnapshot(
                item.DeviceId,
                item.Device.Name,
                item.Device.LiveState is { IsOnline: true },
                item.IsOn,
                item.Brightness,
                item.ColorHex,
                item.ColorTempPercent
            ))
            .ToList();

        var traceId = Activity.Current?.Id ?? Guid.NewGuid().ToString();

        var results = await Task.WhenAll(
            snapshots.Select(snapshot =>
                DispatchInIsolatedScopeAsync(
                    snapshot,
                    request.FirebaseUid,
                    traceId,
                    cancellationToken
                )
            )
        );

        var applied = results.Count(r => r.Status == SceneActivationItemStatus.Applied);
        var failed = results.Count(r => r.Status == SceneActivationItemStatus.Failed);
        var skipped = results.Count(r => r.Status == SceneActivationItemStatus.Skipped);

        var now = DateTimeOffset.UtcNow;

        // "Última ativação" só avança quando a cena realmente aplicou algo.
        if (applied > 0)
            scene.LastActivatedAt = now;

        var (title, description) = ActivityLogMessages.SceneActivated(
            scene.Name,
            applied,
            failed,
            skipped
        );

        dbContext.SystemEvents.Add(
            new SystemEvent
            {
                UserId = user.Id,
                EventType = SystemEventTypes.SceneActivated,
                Title = title,
                Description = description,
                Severity = failed > 0 ? EventSeverity.Warning : EventSeverity.Info,
                Source = EventSource.Scene,
                IsAlert = false,
                TraceId = traceId,
                Timestamp = now,
            }
        );

        await dbContext.SaveChangesAsync(cancellationToken);

        return Result.Success(
            new SceneActivationResultDto(
                scene.Id,
                scene.Name,
                applied,
                failed,
                skipped,
                results.ToList()
            )
        );
    }

    private async Task<SceneActivationItemResultDto> DispatchInIsolatedScopeAsync(
        ItemSnapshot item,
        string firebaseUid,
        string traceId,
        CancellationToken cancellationToken
    )
    {
        if (!item.IsOnline)
            return new SceneActivationItemResultDto(
                item.DeviceId,
                item.DeviceName,
                SceneActivationItemStatus.Skipped,
                "Dispositivo offline."
            );

        await using var scope = scopeFactory.CreateAsyncScope();
        var sender = scope.ServiceProvider.GetRequiredService<ISender>();

        var powerResult = await sender.Send(
            new SetDeviceStateCommand(
                item.DeviceId,
                firebaseUid,
                item.IsOn,
                traceId,
                EventSource.Scene
            ),
            cancellationToken
        );

        if (powerResult.IsFailure)
            return Failed(item, powerResult.Error);

        // Atributos de luz só fazem sentido com o dispositivo ligado.
        if (!item.IsOn)
            return Applied(item);

        if (item.Brightness is { } brightness)
        {
            var result = await sender.Send(
                new SetDeviceBrightnessCommand(item.DeviceId, firebaseUid, brightness),
                cancellationToken
            );
            if (result.IsFailure)
                return Failed(item, result.Error);
        }

        if (item.ColorHex is { } colorHex)
        {
            var result = await sender.Send(
                new SetDeviceColorCommand(item.DeviceId, firebaseUid, colorHex),
                cancellationToken
            );
            if (result.IsFailure)
                return Failed(item, result.Error);
        }

        if (item.ColorTempPercent is { } colorTemp)
        {
            var result = await sender.Send(
                new SetDeviceColorTempCommand(item.DeviceId, firebaseUid, colorTemp),
                cancellationToken
            );
            if (result.IsFailure)
                return Failed(item, result.Error);
        }

        return Applied(item);
    }

    private static SceneActivationItemResultDto Applied(ItemSnapshot item) =>
        new(item.DeviceId, item.DeviceName, SceneActivationItemStatus.Applied, null);

    private static SceneActivationItemResultDto Failed(ItemSnapshot item, Error error) =>
        new(item.DeviceId, item.DeviceName, SceneActivationItemStatus.Failed, error.Description);
}
