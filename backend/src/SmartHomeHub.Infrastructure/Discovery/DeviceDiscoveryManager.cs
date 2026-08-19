using System.Collections.Concurrent;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Application.Features.Devices.Common;

namespace SmartHomeHub.Infrastructure.Discovery;

public sealed class DeviceDiscoveryManager(
    IEnumerable<IDeviceDiscoveryScanner> scanners,
    IServiceScopeFactory scopeFactory,
    ILogger<DeviceDiscoveryManager> logger
) : IDeviceDiscoveryManager
{
    private sealed record DiscoverySession(CancellationTokenSource Cts, ConcurrentDictionary<string, byte> SeenExternalIds);

    private readonly ConcurrentDictionary<string, DiscoverySession> _sessions = new();

    public bool IsDiscoveryRunning(string firebaseUid) => _sessions.ContainsKey(firebaseUid);

    public async Task StartDiscoveryAsync(
        string firebaseUid,
        int timeoutSeconds,
        CancellationToken hubConnectionToken
    )
    {
        await StopDiscoveryAsync(firebaseUid);

        var clampedTimeout = Math.Clamp(timeoutSeconds, 5, 120);
        var timeoutCts = new CancellationTokenSource(TimeSpan.FromSeconds(clampedTimeout));
        var linkedCts = CancellationTokenSource.CreateLinkedTokenSource(timeoutCts.Token, hubConnectionToken);

        var session = new DiscoverySession(linkedCts, new ConcurrentDictionary<string, byte>());

        if (!_sessions.TryAdd(firebaseUid, session))
        {
            timeoutCts.Dispose();
            linkedCts.Dispose();
            return;
        }

        logger.LogInformation(
            "Iniciando descoberta de dispositivos para {FirebaseUid} com timeout de {TimeoutSeconds}s",
            firebaseUid,
            clampedTimeout
        );

        var scannerTasks = scanners.Select(scanner =>
            RunScannerAsync(firebaseUid, scanner, session, linkedCts.Token)
        );

        _ = Task.WhenAll(scannerTasks)
            .ContinueWith(
                completedTask =>
                {
                    _sessions.TryRemove(firebaseUid, out _);
                    timeoutCts.Dispose();
                    linkedCts.Dispose();
                    logger.LogInformation("Descoberta de dispositivos encerrada para {FirebaseUid}", firebaseUid);
                },
                TaskScheduler.Default
            );
    }

    public Task StopDiscoveryAsync(string firebaseUid)
    {
        if (_sessions.TryRemove(firebaseUid, out var session))
        {
            session.Cts.Cancel();
        }

        return Task.CompletedTask;
    }

    private async Task RunScannerAsync(
        string firebaseUid,
        IDeviceDiscoveryScanner scanner,
        DiscoverySession session,
        CancellationToken cancellationToken
    )
    {
        try
        {
            await foreach (var discovered in scanner.ScanAsync(cancellationToken))
            {
                await HandleDiscoveredAsync(firebaseUid, discovered, session, cancellationToken);
            }
        }
        catch (OperationCanceledException)
        {
            // Esperado no Stop/timeout.
        }
        catch (Exception ex)
        {
            logger.LogError(
                ex,
                "Scanner {ScannerType} falhou durante descoberta para {FirebaseUid}",
                scanner.GetType().Name,
                firebaseUid
            );
        }
    }

    private async Task HandleDiscoveredAsync(
        string firebaseUid,
        DiscoveredDeviceDto discovered,
        DiscoverySession session,
        CancellationToken cancellationToken
    )
    {
        if (!session.SeenExternalIds.TryAdd(discovered.ExternalId, 0))
        {
            return;
        }

        using var scope = scopeFactory.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<IAppDbContext>();
        var notificationService = scope.ServiceProvider.GetRequiredService<IRealtimeNotificationService>();

        var user = await dbContext
            .Users.AsNoTracking()
            .FirstOrDefaultAsync(u => u.ExternalAuthUid == firebaseUid, cancellationToken);

        if (user is null)
        {
            return;
        }

        var alreadyOwned = await dbContext
            .Devices.AsNoTracking()
            .AnyAsync(d => d.UserId == user.Id && d.ExternalId == discovered.ExternalId, cancellationToken);

        if (alreadyOwned)
        {
            return;
        }

        logger.LogInformation(
            "Dispositivo descoberto {DeviceName} ({ExternalId}) para {FirebaseUid}",
            discovered.Name,
            discovered.ExternalId,
            firebaseUid
        );

        await notificationService.NotifyDeviceDiscoveredAsync(firebaseUid, discovered, cancellationToken);
    }
}
