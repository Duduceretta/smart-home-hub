using System.Collections.Concurrent;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Domain.Enums;

namespace SmartHomeHub.IntegrationTests.Setup;

// Substitui o DeviceProbeService real (sockets/rede) nos testes de integração:
// resultado por IP configurável via SetResult, sem nunca abrir conexão TCP de verdade.
public sealed class TestDeviceProbeService : IDeviceProbeService
{
    private readonly ConcurrentDictionary<string, bool> _results = new();
    private int _callCount;

    public int CallCount => _callCount;

    public void SetResult(string ipAddress, bool isOnline) => _results[ipAddress] = isOnline;

    public void Reset()
    {
        _results.Clear();
        Interlocked.Exchange(ref _callCount, 0);
    }

    public Task<bool> ProbeDeviceAsync(
        string ipAddress,
        IntegrationType integrationType,
        CancellationToken cancellationToken = default
    )
    {
        Interlocked.Increment(ref _callCount);
        return Task.FromResult(_results.TryGetValue(ipAddress, out var isOnline) && isOnline);
    }
}
