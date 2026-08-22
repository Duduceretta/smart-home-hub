namespace SmartHomeHub.Application.Common.Interfaces;

public interface IGoogleTvService
{
    Task SendKeycodeAsync(
        string ipAddress,
        int keycode,
        CancellationToken cancellationToken = default
    );
}
