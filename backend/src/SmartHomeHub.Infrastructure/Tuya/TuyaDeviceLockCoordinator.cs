using System.Collections.Concurrent;
using Microsoft.Extensions.Logging;
using SmartHomeHub.Domain.Common.Primitives;

namespace SmartHomeHub.Infrastructure.Tuya;

/// <summary>
/// Serializa toda a sequência query+decide+set de uma operação contra o mesmo
/// TuyaDeviceId, tornando-a atômica do ponto de vista de qualquer outra operação
/// no mesmo dispositivo. Extraído de TuyaLocalControlService (ver
/// backend-audit-2026-09-05.md, seção 05) — extração mecânica, mesma lógica.
/// </summary>
internal sealed class TuyaDeviceLockCoordinator(
    ILogger logger,
    // Seam de teste: timeout de aquisição do semáforo menor, pra não deixar o
    // teste de "Device.Busy" esperando 10s de verdade. Produção usa o default.
    TimeSpan? semaphoreAcquireTimeoutForTests = null
)
{
    // Chamada síncrona dentro do handler HTTP — sem limite próprio, uma lâmpada
    // presente na rede mas que não responde prenderia a requisição pelo timeout
    // de TCP do SO (bem mais longo que aceitável). Cada etapa de rede usa este budget.
    // O driver Tuya não reutiliza conexão — cada operação pública abre TCP novo
    // (query de status + set de DPs = 2 handshakes). Sem serialização por
    // dispositivo, duas operações concorrentes no MESMO device (ex: usuário
    // arrastando brilho e cor quase ao mesmo tempo) correm o risco real de uma
    // ler o status ANTES da outra escrever, decidindo com base em informação
    // obsoleta (ver auditoria de drivers IoT). Dispositivos DIFERENTES (IPs/
    // sockets diferentes) nunca competem pelo mesmo semáforo — o paralelismo
    // entre devices distintos continua livre.
    private readonly TimeSpan _semaphoreAcquireTimeout =
        semaphoreAcquireTimeoutForTests ?? TimeSpan.FromSeconds(10);
    private readonly ConcurrentDictionary<string, SemaphoreSlim> _deviceLocks = new();

    // Timeout de aquisição próprio (distinto do OperationTimeout de rede) — se
    // uma operação anterior travar por algum motivo inesperado, a próxima falha
    // com "Device.Busy" em vez de esperar indefinidamente.
    public async Task<Result<T>> WithDeviceLockAsync<T>(
        string tuyaDeviceId,
        Func<Task<Result<T>>> operation,
        CancellationToken cancellationToken,
        TimeSpan? acquireTimeoutOverride = null
    )
    {
        var deviceLock = _deviceLocks.GetOrAdd(tuyaDeviceId, static _ => new SemaphoreSlim(1, 1));

        using var timeoutCts = new CancellationTokenSource(
            acquireTimeoutOverride ?? _semaphoreAcquireTimeout
        );
        using var linkedCts = CancellationTokenSource.CreateLinkedTokenSource(
            cancellationToken,
            timeoutCts.Token
        );

        try
        {
            await deviceLock.WaitAsync(linkedCts.Token);
        }
        catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            logger.LogWarning(
                "Timeout aguardando lock do dispositivo Tuya {DeviceId} — outra operação em andamento.",
                tuyaDeviceId
            );
            return Result.Failure<T>(
                new Error(
                    "Device.Busy",
                    "Dispositivo Tuya ocupado com outro comando. Tente novamente em instantes."
                )
            );
        }

        try
        {
            return await operation();
        }
        finally
        {
            deviceLock.Release();
        }
    }
}
