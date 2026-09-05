using System.Collections.Concurrent;
using Microsoft.Extensions.Logging;
using SmartHomeHub.Application.Common.Interfaces;

namespace SmartHomeHub.Infrastructure.Tuya;

/// <summary>
/// Resolve o IP atual de um dispositivo Tuya via broadcast UDP quando não há IP
/// configurado ou o IP configurado ficou obsoleto (DHCP mudou). Extraído de
/// TuyaLocalControlService (ver backend-audit-2026-09-05.md, seção 05) —
/// extração mecânica, mesma lógica.
/// </summary>
internal sealed class TuyaIpResolver(
    ITuyaUdpDiscoveryScanner ipDiscoveryScanner,
    ILogger logger,
    // Seam de teste: janela do circuit breaker de resolução de IP menor, pra
    // não deixar o teste de "janela expira e tenta de novo" esperando 10s de
    // verdade. Produção usa o default.
    TimeSpan? ipResolutionCircuitBreakerWindowForTests = null
)
{
    private static readonly TimeSpan IpResolutionTimeout = TimeSpan.FromSeconds(3);

    // Circuit breaker leve pra resolução de IP via broadcast UDP: um
    // dispositivo genuinamente offline (não é IP obsoleto por DHCP, é o
    // dispositivo mesmo fora do ar) faria TryResolveIpAsync esperar o
    // IpResolutionTimeout inteiro em TODA tentativa de comando, sem nunca ter
    // sucesso. Janela curta pra falhar rápido nas tentativas seguintes ao
    // mesmo device sem repetir o broadcast redundante, mas curta o bastante
    // pra não mascarar um device que voltou a ficar alcançável logo em
    // seguida. Mecanismo independente do lock por device (TuyaDeviceLockCoordinator)
    // — não compete nem substitui a serialização por device já existente. Ver
    // iot-drivers.md, seção "Driver Local Tuya (TCP)", pro racional completo
    // da janela escolhida.
    private readonly TimeSpan _ipResolutionCircuitBreakerWindow =
        ipResolutionCircuitBreakerWindowForTests ?? TimeSpan.FromSeconds(10);
    private readonly ConcurrentDictionary<string, DateTime> _ipResolutionCircuitBreakerOpenUntil =
        new();

    public async Task<string?> TryResolveIpAsync(
        string tuyaDeviceId,
        CancellationToken cancellationToken
    )
    {
        if (
            _ipResolutionCircuitBreakerOpenUntil.TryGetValue(tuyaDeviceId, out var openUntil)
            && DateTime.UtcNow < openUntil
        )
        {
            logger.LogDebug(
                "Circuit breaker de resolução de IP aberto pro dispositivo Tuya {DeviceId} — pulando broadcast UDP até {OpenUntil:o}.",
                tuyaDeviceId,
                openUntil
            );
            return null;
        }

        using var timeoutCts = new CancellationTokenSource(IpResolutionTimeout);
        using var linkedCts = CancellationTokenSource.CreateLinkedTokenSource(
            cancellationToken,
            timeoutCts.Token
        );

        try
        {
            await foreach (var discovered in ipDiscoveryScanner.ScanAsync(linkedCts.Token))
            {
                if (discovered.ExternalId == tuyaDeviceId && discovered.IpAddress is not null)
                {
                    // Sucesso a qualquer momento limpa o breaker imediatamente — não
                    // é um breaker permanente, só evita repetição redundante enquanto
                    // o device continua genuinamente inalcançável.
                    _ipResolutionCircuitBreakerOpenUntil.TryRemove(tuyaDeviceId, out _);
                    return discovered.IpAddress;
                }
            }
        }
        catch (OperationCanceledException)
        {
            // Timeout esperado — nenhum broadcast do dispositivo alvo chegou a tempo.
        }

        _ipResolutionCircuitBreakerOpenUntil[tuyaDeviceId] = DateTime.UtcNow.Add(
            _ipResolutionCircuitBreakerWindow
        );

        return null;
    }
}
