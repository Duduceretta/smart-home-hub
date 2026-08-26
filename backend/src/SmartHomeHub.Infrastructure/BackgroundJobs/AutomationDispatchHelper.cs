using System.Text.Json;
using Hangfire;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Domain.Entities;
using SmartHomeHub.Domain.ValueObjects;

namespace SmartHomeHub.Infrastructure.BackgroundJobs;

// Compartilhado entre o disparo por telemetria (AutomationExecutionWorker) e o
// disparo por tempo (AutomationTimeTriggerJob) — o cooldown guard precisa ser
// o mesmo em ambos: uma automação disparada por cron e por sensor no mesmo
// instante ainda é UMA automação, não deve executar duas vezes em 5s.
internal static class AutomationDispatchHelper
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
    };

    public static void DispatchActionsSafely(
        Automation automation,
        string traceId,
        IBackgroundJobClient jobClient,
        IMemoryCache memoryCache,
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

        // Trava a automação por 5 segundos. Nenhum novo disparo (sensor ou cron) a executa nesse intervalo.
        memoryCache.Set(cooldownKey, true, TimeSpan.FromSeconds(5));

        var payload = JsonSerializer.Deserialize<AutomationPayload>(
            automation.RulePayload,
            JsonOptions
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
