using SmartHomeHub.Application.Features.Telemetry.Events;

namespace SmartHomeHub.Application.Common.Interfaces;

public interface IAutomationEventQueue
{
    ValueTask WriteAsync(
        TelemetryProcessedEvent @event,
        CancellationToken cancellationToken = default
    );

    IAsyncEnumerable<TelemetryProcessedEvent> ReadAllAsync(
        CancellationToken cancellationToken = default
    );
}
