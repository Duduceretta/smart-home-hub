using Hangfire;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Application.Features.Automations.Engine;
using SmartHomeHub.Application.Features.Telemetry.Events;

namespace SmartHomeHub.Infrastructure.BackgroundJobs;

public sealed class AutomationExecutionWorker(
    IServiceScopeFactory scopeFactory,
    IAutomationEventQueue eventQueue,
    ILogger<AutomationExecutionWorker> logger,
    IMemoryCache memoryCache
) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.LogInformation("Iniciando Worker de Automações (Channel Consumer)...");

        await foreach (var @event in eventQueue.ReadAllAsync(stoppingToken))
        {
            try
            {
                await ProcessEventAsync(@event, stoppingToken);
            }
            catch (Exception ex)
            {
                logger.LogError(
                    ex,
                    "Falha crítica na orquestração de automações. TraceId: {TraceId}",
                    @event.TraceId
                );
            }
        }
    }

    private async Task ProcessEventAsync(
        TelemetryProcessedEvent @event,
        CancellationToken cancellationToken
    )
    {
        using var scope = scopeFactory.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<IAppDbContext>();
        var rulesEngine = scope.ServiceProvider.GetRequiredService<IAutomationRulesEngine>();
        var jobClient = scope.ServiceProvider.GetRequiredService<IBackgroundJobClient>();

        var context = new AutomationEvaluationContext(
            @event.DeviceId,
            @event.IsOn,
            @event.PowerUsageWatts,
            @event.TemperatureCelsius
        );

        // Busca as automações ativas
        // Nota: Em cenários de altíssima escala, isso seria cacheado,
        // mas para o MVP ler do banco em tempo real é seguro.
        var automations = await dbContext
            .Automations.Include(a => a.User)
            .AsNoTracking()
            .Where(a => a.IsActive)
            .ToListAsync(cancellationToken);

        foreach (var automation in automations)
        {
            try
            {
                if (rulesEngine.Evaluate(automation, context))
                {
                    AutomationDispatchHelper.DispatchActionsSafely(
                        automation,
                        @event.TraceId,
                        jobClient,
                        memoryCache,
                        logger
                    );
                }
            }
            catch (Exception ex)
            {
                // Isola a automação com problema (ex: RulePayload malformado) para não
                // impedir a avaliação das demais automações deste mesmo evento.
                logger.LogError(
                    ex,
                    "Falha ao avaliar/despachar a automação {AutomationId}. TraceId: {TraceId}",
                    automation.Id,
                    @event.TraceId
                );
            }
        }
    }
}
