using System.Diagnostics;
using Mediator;
using Microsoft.Extensions.Logging;

namespace SmartHomeHub.Application.Common.Behaviors;

public class LoggingBehavior<TMessage, TResponse>(
    ILogger<LoggingBehavior<TMessage, TResponse>> logger
) : IPipelineBehavior<TMessage, TResponse>
    where TMessage : IMessage
{
    private static readonly string _messageName = typeof(TMessage).Name;

    public async ValueTask<TResponse> Handle(
        TMessage message,
        MessageHandlerDelegate<TMessage, TResponse> next,
        CancellationToken cancellationToken
    )
    {
        if (logger.IsEnabled(LogLevel.Information))
        {
            logger.LogInformation("⏳ [CQRS] Iniciando {MessageName}", _messageName);
        }

        var stopwatch = Stopwatch.StartNew();

        var response = await next(message, cancellationToken);

        stopwatch.Stop();

        if (logger.IsEnabled(LogLevel.Information))
        {
            logger.LogInformation(
                "✅ [CQRS] {MessageName} concluído em {ElapsedMilliseconds}ms",
                _messageName,
                stopwatch.ElapsedMilliseconds
            );
        }

        return response;
    }
}
