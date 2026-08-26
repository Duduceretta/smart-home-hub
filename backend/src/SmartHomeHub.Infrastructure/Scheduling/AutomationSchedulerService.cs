using Hangfire;
using SmartHomeHub.Application.Common.Interfaces;

namespace SmartHomeHub.Infrastructure.Scheduling;

public sealed class AutomationSchedulerService(IRecurringJobManager recurringJobManager)
    : IAutomationSchedulerService
{
    private static string JobId(Guid automationId) => $"automation_time_{automationId}";

    public void ScheduleAutomation(Guid automationId, string cronExpression)
    {
        recurringJobManager.AddOrUpdate<IAutomationTimeTriggerJob>(
            JobId(automationId),
            job => job.ExecuteAsync(automationId),
            cronExpression
        );
    }

    public void UnscheduleAutomation(Guid automationId)
    {
        recurringJobManager.RemoveIfExists(JobId(automationId));
    }
}
