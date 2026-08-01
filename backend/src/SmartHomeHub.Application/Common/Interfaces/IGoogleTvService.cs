namespace SmartHomeHub.Application.Common.Interfaces;

public interface IGoogleTvService
{
    Task WakeUpAsync(string macAddress, CancellationToken cancellationToken = default);

    Task SendKeycodeAsync(
        string ipAddress,
        int keycode,
        CancellationToken cancellationToken = default
    );
}
