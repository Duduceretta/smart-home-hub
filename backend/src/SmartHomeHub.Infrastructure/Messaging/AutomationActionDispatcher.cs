using System.Diagnostics;
using Mediator;
using Microsoft.Extensions.Logging;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Application.Features.Devices.Commands.SetDeviceState;
using SmartHomeHub.Domain.Common.Primitives;

namespace SmartHomeHub.Infrastructure.Messaging;

public sealed class AutomationActionDispatcher(
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

        logger.LogInformation(
            "Executando ação da automação. DeviceId: {DeviceId} | DesiredState: {State}",
            deviceId,
            desiredState
        );

        var command = new SetDeviceStateCommand(deviceId, firebaseUid, desiredState, traceId);

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
    }
}
