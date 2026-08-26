namespace SmartHomeHub.Application.Common.Interfaces;

public interface IAutomationSchedulerService
{
    void ScheduleAutomation(Guid automationId, string cronExpression);
    void UnscheduleAutomation(Guid automationId);
}
