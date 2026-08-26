using System.Text.Json;
using Hangfire;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Application.Features.Automations.Engine;
using SmartHomeHub.Application.Features.Telemetry.Events;
using SmartHomeHub.Domain.Entities;
using SmartHomeHub.Domain.ValueObjects;

namespace SmartHomeHub.Infrastructure.BackgroundJobs;

public sealed class AutomationExecutionWorker(
    IServiceScopeFactory scopeFactory,
    IAutomationEventQueue eventQueue,
    ILogger<AutomationExecutionWorker> logger,
    IMemoryCache memoryCache
) : BackgroundService
{
    private static readonly JsonSerializerOptions _jsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
    };

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
                    DispatchActionsSafely(automation, @event.TraceId, jobClient, logger);
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

    private void DispatchActionsSafely(
        Automation automation,
        string traceId,
        IBackgroundJobClient jobClient,
        ILogger logger
    )
    {
        // ---------------------------------------------------------
        // COOLDOWN GUARD: Previne o "Automation Storm"
        // ---------------------------------------------------------
        var cooldownKey = $"cooldown_automation_{automation.Id}";
        if (memoryCache.TryGetValue(cooldownKey, out _))
        {
            logger.LogDebug("Automação {Id} ignorada pelo Cooldown Guard.", automation.Id);
            return;
        }

        // Trava a automação por 5 segundos. Nenhuma nova telemetria fará ela disparar nesse intervalo.
        memoryCache.Set(cooldownKey, true, TimeSpan.FromSeconds(5));

        var payload = JsonSerializer.Deserialize<AutomationPayload>(
            automation.RulePayload,
            _jsonOptions
        );
        if (payload?.Actions == null)
            return;

        foreach (var action in payload.Actions)
        {
            // Transfere a responsabilidade para o Hangfire (durabilidade + retry automático)
            jobClient.Enqueue<IAutomationActionDispatcher>(dispatcher =>
                dispatcher.DispatchAsync(
                    automation.Id,
                    action.DeviceId,
                    automation.User.ExternalAuthUid,
                    action.DesiredState,
                    traceId
                )
            );

            logger.LogInformation(
                "Ação enfileirada no Hangfire: DeviceId={DeviceId}, DesiredState={State}, TraceId={TraceId}",
                action.DeviceId,
                action.DesiredState,
                traceId
            );
        }
    }
}
