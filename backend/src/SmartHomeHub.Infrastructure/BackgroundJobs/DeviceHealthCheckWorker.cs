using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using SmartHomeHub.Application.Common.Extensions;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Application.Features.Dashboards.ActivityLog;
using SmartHomeHub.Domain.Common.Constants;
using SmartHomeHub.Domain.Entities;
using SmartHomeHub.Domain.Enums;
using SmartHomeHub.Domain.ValueObjects;

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
        var notificationService =
            scope.ServiceProvider.GetRequiredService<IRealtimeNotificationService>();

        var candidates = await dbContext
            .Devices.Include(device => device.User)
            .Include(device => device.Room)
            .Include(device => device.LiveState)
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
            probeable.Select(async device =>
                (
                    Device: device,
                    IsOnline: await probeService.ProbeDeviceAsync(
                        device.Configuration.IpAddress!,
                        device.IntegrationType,
                        cancellationToken
                    )
                )
            )
        );

        var changed = new List<Device>();

        foreach (var (device, isOnline) in probeResults)
        {
            var liveState = device.LiveState;
            if (liveState == null)
            {
                liveState = new DeviceLiveState
                {
                    DeviceId = device.Id,
                    IsOn = device.IsOn,
                    IsOnline = device.IsOnline,
                    LastSeenAt = device.LastSeenAt,
                    Attributes = new DeviceLiveStateAttributes
                    {
                        Brightness = device.Brightness,
                        ColorHex = device.ColorHex,
                        ColorTempPercent = device.ColorTempPercent,
                    },
                };
                device.LiveState = liveState;
                dbContext.DeviceLiveStates.Add(liveState);
            }

            var currentOnline = liveState.IsOnline;
            if (currentOnline == isOnline)
            {
                continue;
            }

            device.IsOnline = isOnline;
            liveState.IsOnline = isOnline;
            if (isOnline)
            {
                device.LastSeenAt = DateTimeOffset.UtcNow;
                liveState.LastSeenAt = device.LastSeenAt;
            }

            changed.Add(device);
        }

        if (changed.Count == 0)
        {
            return;
        }

        foreach (var device in changed)
        {
            var liveState = device.LiveState!;
            var (title, description) = ActivityLogMessages.DeviceConnectivityChanged(
                device.Name,
                device.Room?.Name,
                liveState.IsOnline
            );

            dbContext.SystemEvents.Add(
                new SystemEvent
                {
                    UserId = device.UserId,
                    DeviceId = device.Id,
                    EventType = liveState.IsOnline
                        ? SystemEventTypes.DeviceOnline
                        : SystemEventTypes.DeviceOffline,
                    Title = title,
                    Description = description,
                    Severity = liveState.IsOnline ? EventSeverity.Info : EventSeverity.Warning,
                    Source = EventSource.System,
                    DeviceName = device.Name,
                    RoomId = device.RoomId,
                    RoomName = device.Room?.Name,
                    OldValue = liveState.IsOnline ? "offline" : "online",
                    NewValue = liveState.IsOnline ? "online" : "offline",
                    IsAlert = !liveState.IsOnline,
                    Timestamp = DateTimeOffset.UtcNow,
                }
            );
        }

        await dbContext.SaveChangesAsync(cancellationToken);

        foreach (var device in changed)
        {
            var liveState = device.LiveState!;
            logger.LogInformation(
                "Dispositivo {DeviceId} mudou para {Status}",
                device.Id,
                liveState.IsOnline ? "online" : "offline"
            );

            await notificationService.NotifyDeviceStatusChangedAsync(
                device.User.ExternalAuthUid,
                device.Id,
                liveState.IsOn,
                liveState.IsOnline,
                cancellationToken
            );
        }
    }
}
