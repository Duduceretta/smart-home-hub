namespace SmartHomeHub.Application.Common.Interfaces;

public interface IAutomationActionDispatcher
{
    Task DispatchAsync(
        Guid automationId,
        Guid deviceId,
        string firebaseUid,
        bool desiredState,
        string traceId
    );
}
