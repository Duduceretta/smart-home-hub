using System.Diagnostics;
using System.Security.Cryptography;
using System.Text;
using Mediator;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Application.Features.Dashboards.ActivityLog;
using SmartHomeHub.Domain.Common.Constants;
using SmartHomeHub.Application.Features.Devices.Commands.SetDeviceState;
using SmartHomeHub.Domain.Common.Primitives;
using SmartHomeHub.Domain.Entities;
using SmartHomeHub.Domain.Enums;

namespace SmartHomeHub.Infrastructure.Messaging;

public sealed class AutomationActionDispatcher(
    IAppDbContext dbContext,
    IMediator mediator,
    IRealtimeNotificationService notificationService,
    ILogger<AutomationActionDispatcher> logger
) : IAutomationActionDispatcher
{
    public async Task DispatchAsync(
        Guid automationId,
        Guid deviceId,
        string firebaseUid,
        bool desiredState,
        string traceId
    )
    {
        // 1. Reconstrução do contexto de logs na fronteira do Hangfire
        using var scope = logger.BeginScope(
            new Dictionary<string, object> { ["TraceId"] = traceId }
        );

        // 2. Continuação do tracing distribuído (OpenTelemetry)
        using var activity = new Activity("Hangfire.DispatchAction");
        activity.SetParentId(traceId);
        activity.Start();

        // 3. Chave de idempotência: reserva ANTES de tocar hardware. Hangfire
        // entrega at-least-once — se o worker morrer entre "mensagem publicada"
        // e "job marcado como concluído", o retry cairia aqui de novo e repetiria
        // o comando físico sem essa guarda.
        var idempotencyKey = ComputeIdempotencyKey(automationId, traceId, deviceId);

        var alreadyProcessed = await dbContext.IdempotencyRecords.AnyAsync(record =>
            record.Id == idempotencyKey
        );

        if (alreadyProcessed)
        {
            logger.LogInformation(
                "Job duplicado do Hangfire ignorado (idempotency key já processada). DeviceId: {DeviceId}",
                deviceId
            );
            return;
        }

        dbContext.IdempotencyRecords.Add(
            new IdempotencyRecord { Id = idempotencyKey, CreatedAt = DateTimeOffset.UtcNow }
        );

        try
        {
            await dbContext.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            // Corrida: outra execução concorrente já reivindicou essa chave primeiro.
            logger.LogInformation(
                "Corrida na chave de idempotência detectada, execução cedida à outra instância. DeviceId: {DeviceId}",
                deviceId
            );
            return;
        }

        logger.LogInformation(
            "Executando ação da automação. DeviceId: {DeviceId} | DesiredState: {State}",
            deviceId,
            desiredState
        );

        // Nomes só pra montar o texto do log de atividade — duas leituras leves,
        // sem tracking, fora do fluxo de negócio (SetDeviceStateCommand nem
        // sabe que quem chamou foi uma automação).
        var automationName =
            await dbContext
                .Automations.AsNoTracking()
                .Where(automation => automation.Id == automationId)
                .Select(automation => automation.Name)
                .FirstOrDefaultAsync() ?? "Automação";
        var device =
            await dbContext
                .Devices.AsNoTracking()
                .Where(d => d.Id == deviceId)
                .Select(d => new
                {
                    d.Name,
                    d.RoomId,
                    RoomName = d.Room != null ? d.Room.Name : null,
                })
                .FirstOrDefaultAsync();
        var deviceName = device?.Name ?? "dispositivo";
        var roomId = device?.RoomId;
        var roomName = device?.RoomName;

        var command = new SetDeviceStateCommand(
            deviceId,
            firebaseUid,
            desiredState,
            traceId,
            EventSource.Automation
        );

        Result result;
        try
        {
            result = await mediator.Send(command);
        }
        catch (Exception ex)
        {
            // A UI não pode ficar no escuro enquanto o Hangfire tenta de novo:
            // notifica a falha agora e relança para o retry/dashboard continuarem
            // funcionando exatamente como antes.
            await notificationService.NotifyAutomationExecutionResultAsync(
                firebaseUid,
                automationId,
                deviceId,
                success: false,
                ex.Message,
                traceId
            );
            await LogExecutionResultAsync(
                automationId,
                deviceId,
                automationName,
                deviceName,
                roomId,
                roomName,
                desiredState,
                success: false,
                ex.Message
            );
            throw;
        }

        if (result.IsFailure)
        {
            // Erros lógicos (ex: dispositivo deletado, sem IP) não têm retry
            logger.LogWarning(
                "Falha não-recuperável na automação para {DeviceId}: {Error}",
                deviceId,
                result.Error.Description
            );

            await notificationService.NotifyAutomationExecutionResultAsync(
                firebaseUid,
                automationId,
                deviceId,
                success: false,
                result.Error.Description,
                traceId
            );
            await LogExecutionResultAsync(
                automationId,
                deviceId,
                automationName,
                deviceName,
                roomId,
                roomName,
                desiredState,
                success: false,
                result.Error.Description
            );
            return;
        }

        await notificationService.NotifyAutomationExecutionResultAsync(
            firebaseUid,
            automationId,
            deviceId,
            success: true,
            errorMessage: null,
            traceId
        );
        await LogExecutionResultAsync(
            automationId,
            deviceId,
            automationName,
            deviceName,
            roomId,
            roomName,
            desiredState,
            success: true,
            errorMessage: null
        );
    }

    // Persiste o resultado como SystemEvent — vira histórico de execução da
    // automação (GetAutomationExecutionHistoryQuery) e aparece na Linha do
    // Tempo global do dashboard (GetActivityLogQuery), do mesmo jeito que
    // DeviceStatus/DeviceMedia/Spotify já fazem. Não bloqueia o fluxo principal:
    // uma falha ao gravar o log de atividade não deve derrubar o dispatch.
    private async Task LogExecutionResultAsync(
        Guid automationId,
        Guid deviceId,
        string automationName,
        string deviceName,
        Guid? roomId,
        string? roomName,
        bool desiredState,
        bool success,
        string? errorMessage
    )
    {
        try
        {
            var user = await dbContext
                .Automations.AsNoTracking()
                .Where(automation => automation.Id == automationId)
                .Select(automation => automation.UserId)
                .FirstOrDefaultAsync();

            var (title, description) = ActivityLogMessages.AutomationExecutionResult(
                automationName,
                deviceName,
                success,
                errorMessage
            );

            dbContext.SystemEvents.Add(
                new SystemEvent
                {
                    UserId = user,
                    DeviceId = deviceId,
                    AutomationId = automationId,
                    EventType = SystemEventTypes.AutomationTriggered,
                    Title = title,
                    Description = description,
                    Severity = success ? EventSeverity.Info : EventSeverity.Error,
                    Source = EventSource.Automation,
                    DeviceName = deviceName,
                    RoomId = roomId,
                    RoomName = roomName,
                    OldValue = null,
                    NewValue = success ? (desiredState ? "on" : "off") : null,
                    IsAlert = !success,
                    Timestamp = DateTimeOffset.UtcNow,
                }
            );
            await dbContext.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            logger.LogWarning(
                ex,
                "Falha ao persistir o log de execução da automação {AutomationId}",
                automationId
            );
        }
    }

    // Determinístico por (automação, evento de telemetria, dispositivo-alvo) — uma
    // automação com várias ações no mesmo disparo gera chaves distintas por
    // dispositivo, então cada ação ainda executa uma vez; só a repetição do
    // mesmo job pelo Hangfire é bloqueada.
    private static string ComputeIdempotencyKey(Guid automationId, string traceId, Guid deviceId)
    {
        var raw = $"{automationId}:{traceId}:{deviceId}";
        var hash = SHA256.HashData(Encoding.UTF8.GetBytes(raw));
        return Convert.ToHexString(hash);
    }
}
