using SmartHomeHub.Application.Features.Devices.Common;

namespace SmartHomeHub.Application.Common.Interfaces;

// Marca o scanner de broadcast UDP Tuya (IDeviceDiscoveryScanner especializado)
// como injetável isoladamente — permite que TuyaLocalControlService reaproveite
// exatamente o mesmo código de listen/decodificação para redescoberta de IP,
// sem depender do tipo concreto (sealed, não substituível em testes) nem duplicar
// a lógica de bind/parse do broadcast.
public interface ITuyaUdpDiscoveryScanner
{
    IAsyncEnumerable<DiscoveredDeviceDto> ScanAsync(CancellationToken cancellationToken);
}
