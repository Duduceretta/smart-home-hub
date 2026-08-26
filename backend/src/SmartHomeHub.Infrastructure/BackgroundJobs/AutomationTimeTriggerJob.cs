using System.Diagnostics;
using Hangfire;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Application.Features.Automations.Engine;

namespace SmartHomeHub.Infrastructure.BackgroundJobs;

public sealed class AutomationTimeTriggerJob(
    IAppDbContext dbContext,
    IAutomationRulesEngine rulesEngine,
    IBackgroundJobClient jobClient,
    IAutomationSchedulerService schedulerService,
    IMemoryCache memoryCache,
    ILogger<AutomationTimeTriggerJob> logger
) : IAutomationTimeTriggerJob
{
    public async Task ExecuteAsync(Guid automationId)
    {
        // 1. Início de um novo fluxo: não há requisição HTTP nem telemetria por
        // trás de um gatilho de cron, então o TraceId nasce aqui.
        var traceId = ActivityTraceId.CreateRandom().ToString();
        using var scope = logger.BeginScope(
            new Dictionary<string, object> { ["TraceId"] = traceId }
        );
        using var activity = new Activity("Hangfire.TimeTrigger");
        activity.Start();

        logger.LogInformation("Iniciando Time Trigger para automação {AutomationId}", automationId);

        var automation = await dbContext
            .Automations.Include(a => a.User)
            .AsNoTracking()
            .FirstOrDefaultAsync(a => a.Id == automationId);

        // Automação excluída/desativada depois do agendamento ter sido criado:
        // limpa o próprio Recurring Job em vez de deixá-lo rodando pra sempre no vazio.
        if (automation == null || !automation.IsActive)
        {
            logger.LogWarning(
                "Automação {AutomationId} inativa ou excluída. Removendo agendamento cron.",
                automationId
            );
            schedulerService.UnscheduleAutomation(automationId);
            return;
        }

        // 2. Contexto zerado: o gatilho é o próprio relógio, não uma leitura de
        // hardware. Se a árvore ECA tiver condições que dependam de sensor,
        // elas vão falhar contra este contexto vazio — isso é esperado: um
        // time trigger com condição de dispositivo não é "sem condição, só o
        // horário", e cabe ao editor visual impedir essa combinação, não a este job.
        var context = new AutomationEvaluationContext(Guid.Empty, false, null, null);

        if (!rulesEngine.Evaluate(automation, context))
        {
            return;
        }

        AutomationDispatchHelper.DispatchActionsSafely(
            automation,
            traceId,
            jobClient,
            memoryCache,
            logger
        );
    }
}
