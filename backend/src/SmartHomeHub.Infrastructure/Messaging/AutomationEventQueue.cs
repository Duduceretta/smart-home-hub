using System.Diagnostics.Metrics;
using System.Threading.Channels;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Application.Features.Telemetry.Events;

namespace SmartHomeHub.Infrastructure.Messaging;

public sealed class AutomationEventQueue : IAutomationEventQueue
{
    private readonly Channel<TelemetryProcessedEvent> _channel;
    private static readonly Meter _meter = new("SmartHomeHub.Automations");
    private readonly Counter<long> _droppedEventsCounter;

    public AutomationEventQueue()
    {
        var options = new BoundedChannelOptions(10_000)
        {
            FullMode = BoundedChannelFullMode.DropOldest,
            SingleReader = true,
            SingleWriter = false,
        };

        _channel = Channel.CreateBounded<TelemetryProcessedEvent>(options);

        // ---------------------------------------------------------
        // OBSERVABILIDADE: Registrando as métricas da fila
        // ---------------------------------------------------------

        // 1. Contador de descartes (rejeições do TryWrite)
        _droppedEventsCounter = _meter.CreateCounter<long>(
            "automations.queue.dropped_events",
            description: "Número de eventos rejeitados pelo Channel (ex: durante shutdown)."
        );

        // 2. Medidor em tempo real do tamanho da fila (Gauge)
        _meter.CreateObservableGauge<int>(
            "automations.queue.depth",
            () => _channel.Reader.Count,
            description: "Número atual de eventos de telemetria aguardando processamento na fila."
        );
    }

    public ValueTask WriteAsync(
        TelemetryProcessedEvent @event,
        CancellationToken cancellationToken = default
    )
    {
        // Se a fila rejeitar a escrita (ex: channel foi completado no shutdown do host),
        // incrementamos o contador.
        // Nota: O modo DropOldest faz o TryWrite retornar 'true' na maioria das vezes,
        // mas a profundidade da fila (Gauge) avisará se estivermos sempre no limite (10.000).
        if (!_channel.Writer.TryWrite(@event))
        {
            _droppedEventsCounter.Add(1);
        }

        return ValueTask.CompletedTask;
    }

    public IAsyncEnumerable<TelemetryProcessedEvent> ReadAllAsync(
        CancellationToken cancellationToken = default
    )
    {
        return _channel.Reader.ReadAllAsync(cancellationToken);
    }
}
