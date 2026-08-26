using Mediator;
using SmartHomeHub.Application.Common.Interfaces;

namespace SmartHomeHub.Application.Features.Telemetry.Events;

/// <summary>
/// Escuta o evento de telemetria e o enfileira na memória (Channel) para ser processado 
/// de forma assíncrona pelo motor de automações, liberando a thread principal imediatamente.
/// </summary>
public sealed class TelemetryProcessedEventHandler(IAutomationEventQueue eventQueue) 
    : INotificationHandler<TelemetryProcessedEvent>
{
    public ValueTask Handle(TelemetryProcessedEvent notification, CancellationToken cancellationToken)
    {
        // O TryWrite por baixo dos panos é síncrono e instantâneo.
        // Não há espera por banco de dados ou rede aqui.
        return eventQueue.WriteAsync(notification, cancellationToken);
    }
}

/// <summary>
/// Evento disparado logo após a telemetria ser processada e salva no banco.
/// Implementa INotification para ser distribuído sem acoplar o produtor aos consumidores.
/// </summary>
public record TelemetryProcessedEvent(
    Guid DeviceId,
    string FirebaseUid,
    bool IsOn,
    double? PowerUsageWatts,
    double? TemperatureCelsius,
    string TraceId
) : INotification;
