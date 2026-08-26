using System.Threading.Channels;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Application.Features.Telemetry.Events;

namespace SmartHomeHub.Infrastructure.Messaging;

public sealed class AutomationEventQueue : IAutomationEventQueue
{
    private readonly Channel<TelemetryProcessedEvent> _channel;

    public AutomationEventQueue()
    {
        // Fila limitada (Bounded) para proteger a memória do servidor.
        // Capacidade para 10.000 eventos na fila de espera.
        var options = new BoundedChannelOptions(10_000)
        {
            // Backpressure: Se a fila lotar (pico extremo), descarta a telemetria mais velha.
            // Para IoT, o dado mais recente é sempre o mais importante.
            FullMode = BoundedChannelFullMode.DropOldest,

            // Otimizações de performance do .NET
            SingleReader = true, // Apenas 1 Worker vai consumir essa fila
            SingleWriter = false, // Várias requisições/MQTT podem tentar escrever ao mesmo tempo
        };

        _channel = Channel.CreateBounded<TelemetryProcessedEvent>(options);
    }

    public ValueTask WriteAsync(
        TelemetryProcessedEvent @event,
        CancellationToken cancellationToken = default
    )
    {
        // TryWrite é síncrono e não bloqueia a thread, ideal para o nosso hot
        // path — por isso o método não é `async`: um `await
        // ValueTask.CompletedTask` força o compilador a gerar uma state
        // machine assíncrona pra um método que nunca aguarda nada de
        // verdade, o oposto do que o comentário original prometia.
        _channel.Writer.TryWrite(@event);
        return ValueTask.CompletedTask;
    }

    public IAsyncEnumerable<TelemetryProcessedEvent> ReadAllAsync(
        CancellationToken cancellationToken = default
    )
    {
        return _channel.Reader.ReadAllAsync(cancellationToken);
    }
}
