using System.Runtime.CompilerServices;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Application.Features.Devices.Common;
using SmartHomeHub.Domain.Enums;

namespace SmartHomeHub.IntegrationTests.Setup;

// Substitui os 4 scanners reais (mDNS/SSDP/Tuya/MQTT) nos testes de integração:
// evita sockets/rede real em CI e permite que cada teste controle exatamente o que "é descoberto".
public sealed class TestDiscoveryScanner : IDeviceDiscoveryScanner
{
    public IntegrationType IntegrationType => IntegrationType.MdnsZeroconf;

    public List<DiscoveredDeviceDto> QueuedResults { get; } = [];

    public async IAsyncEnumerable<DiscoveredDeviceDto> ScanAsync(
        [EnumeratorCancellation] CancellationToken cancellationToken
    )
    {
        foreach (var result in QueuedResults.ToArray())
        {
            yield return result;
        }

        try
        {
            await Task.Delay(Timeout.Infinite, cancellationToken);
        }
        catch (OperationCanceledException)
        {
            // Encerramento esperado via StopDiscoveryAsync/timeout.
        }
    }
}
