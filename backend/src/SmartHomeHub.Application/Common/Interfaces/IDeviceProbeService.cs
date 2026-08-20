using SmartHomeHub.Domain.Enums;

namespace SmartHomeHub.Application.Common.Interfaces;

public interface IDeviceProbeService
{
    Task<bool> ProbeDeviceAsync(
        string ipAddress,
        IntegrationType integrationType,
        CancellationToken cancellationToken = default
    );
}
