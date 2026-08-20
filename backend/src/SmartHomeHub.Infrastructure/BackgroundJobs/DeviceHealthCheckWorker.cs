using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using SmartHomeHub.Application.Common.Extensions;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Domain.Entities;

namespace SmartHomeHub.Infrastructure.BackgroundJobs;

public sealed class DeviceHealthCheckWorker(
    IServiceScopeFactory scopeFactory,
    IDeviceProbeService probeService,
    ILogger<DeviceHealthCheckWorker> logger
) : BackgroundService
{
    private static readonly TimeSpan CheckInterval = TimeSpan.FromSeconds(12);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.LogInformation("Iniciando o worker de Health Check de dispositivos...");

        using var timer = new PeriodicTimer(CheckInterval);

        try
        {
            while (await timer.WaitForNextTickAsync(stoppingToken))
            {
                try
                {
                    await RunHealthCheckCycleAsync(stoppingToken);
                }
                catch (Exception ex)
                {
                    logger.LogError(ex, "Ciclo de Health Check falhou de forma inesperada.");
                }
            }
        }
        catch (OperationCanceledException)
        {
            logger.LogInformation("Desligando o worker de Health Check de forma segura...");
        }
    }

    public async Task RunHealthCheckCycleAsync(CancellationToken cancellationToken)
    {
        using var scope = scopeFactory.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<IAppDbContext>();
        var notificationService = scope.ServiceProvider.GetRequiredService<IRealtimeNotificationService>();

        var candidates = await dbContext
            .Devices.Include(device => device.User)
            .Where(device => device.Configuration.IpAddress != null)
            .ToListAsync(cancellationToken);

        var probeable = candidates
            .Where(device => device.User != null && device.IntegrationType.IsNetworkProbeable())
            .ToList();

        if (probeable.Count == 0)
        {
            return;
        }

        var probeResults = await Task.WhenAll(
            probeable.Select(async device => (
                Device: device,
                IsOnline: await probeService.ProbeDeviceAsync(
                    device.Configuration.IpAddress!,
                    device.IntegrationType,
                    cancellationToken
                )
            ))
        );

        var changed = new List<Device>();

        foreach (var (device, isOnline) in probeResults)
        {
            if (device.IsOnline == isOnline)
            {
                continue;
            }

            device.IsOnline = isOnline;
            if (isOnline)
            {
                device.LastSeenAt = DateTimeOffset.UtcNow;
            }

            changed.Add(device);
        }

        if (changed.Count == 0)
        {
            return;
        }

        await dbContext.SaveChangesAsync(cancellationToken);

        foreach (var device in changed)
        {
            logger.LogInformation(
                "Dispositivo {DeviceId} mudou para {Status}",
                device.Id,
                device.IsOnline ? "online" : "offline"
            );

            await notificationService.NotifyDeviceStatusChangedAsync(
                device.User.ExternalAuthUid,
                device.Id,
                device.IsOn,
                device.IsOnline,
                cancellationToken
            );
        }
    }
}
