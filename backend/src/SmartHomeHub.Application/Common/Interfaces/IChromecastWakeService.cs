namespace SmartHomeHub.Application.Common.Interfaces;

public interface IChromecastWakeService
{
    Task WakeUpAsync(string ipAddress, CancellationToken cancellationToken = default);
}
