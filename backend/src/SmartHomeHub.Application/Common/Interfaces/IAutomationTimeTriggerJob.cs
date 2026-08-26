namespace SmartHomeHub.Application.Common.Interfaces;

public interface IAutomationTimeTriggerJob
{
    Task ExecuteAsync(Guid automationId);
}
