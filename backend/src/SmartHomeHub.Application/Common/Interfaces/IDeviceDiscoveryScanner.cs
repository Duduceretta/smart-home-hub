using SmartHomeHub.Application.Features.Devices.Common;
using SmartHomeHub.Domain.Enums;

namespace SmartHomeHub.Application.Common.Interfaces;

public interface IDeviceDiscoveryScanner
{
    IntegrationType IntegrationType { get; }

    IAsyncEnumerable<DiscoveredDeviceDto> ScanAsync(CancellationToken cancellationToken);
}
