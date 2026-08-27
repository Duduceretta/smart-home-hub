using Hangfire;
using SmartHomeHub.Application.Common.Interfaces;

namespace SmartHomeHub.Infrastructure.Scheduling;

public sealed class AutomationSchedulerService(IRecurringJobManager recurringJobManager)
    : IAutomationSchedulerService
{
    private static string JobId(Guid automationId) => $"automation_time_{automationId}";

    // O editor de automações manda o HH:mm literal escolhido no time-picker
    // (horário local do usuário), sem conversão pra UTC — então o Hangfire
    // precisa saber que esse cron é local, senão interpreta como UTC e o
    // disparo sai 3h adiantado/atrasado (Brasil = UTC-3). Hub de casa única,
    // fuso fixo; multi-tenant com fusos diferentes exigiria persistir o fuso
    // por usuário, não cabe nesse escopo.
    private static readonly TimeZoneInfo AppTimeZone = TimeZoneInfo.FindSystemTimeZoneById(
        "America/Sao_Paulo"
    );

    public void ScheduleAutomation(Guid automationId, string cronExpression)
    {
        recurringJobManager.AddOrUpdate<IAutomationTimeTriggerJob>(
            JobId(automationId),
            job => job.ExecuteAsync(automationId),
            cronExpression,
            new RecurringJobOptions { TimeZone = AppTimeZone }
        );
    }

    public void UnscheduleAutomation(Guid automationId)
    {
        recurringJobManager.RemoveIfExists(JobId(automationId));
    }
}
