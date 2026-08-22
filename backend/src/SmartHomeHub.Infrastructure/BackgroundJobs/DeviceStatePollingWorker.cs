using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Domain.Entities;
using SmartHomeHub.Domain.Enums;

namespace SmartHomeHub.Infrastructure.BackgroundJobs;

public sealed class DeviceStatePollingWorker(
    IServiceScopeFactory scopeFactory,
    IGoogleTvService googleTvService,
    ILogger<DeviceStatePollingWorker> logger
) : BackgroundService
{
    private static readonly TimeSpan PollingInterval = TimeSpan.FromSeconds(12);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.LogInformation("Iniciando o worker de sondagem de estado de energia das TVs...");

        using var timer = new PeriodicTimer(PollingInterval);

        try
        {
            while (await timer.WaitForNextTickAsync(stoppingToken))
            {
                try
                {
                    await RunPollingCycleAsync(stoppingToken);
                }
                catch (Exception ex)
                {
                    logger.LogError(ex, "Ciclo de sondagem de estado de energia falhou de forma inesperada.");
                }
            }
        }
        catch (OperationCanceledException)
        {
            logger.LogInformation("Desligando o worker de sondagem de estado de energia de forma segura...");
        }
    }

    public async Task RunPollingCycleAsync(CancellationToken cancellationToken)
    {
        using var scope = scopeFactory.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<IAppDbContext>();
        var notificationService = scope.ServiceProvider.GetRequiredService<IRealtimeNotificationService>();

        var candidates = await dbContext
            .Devices.Include(device => device.User)
            .Where(device =>
                device.Type == DeviceType.Television && device.Configuration.IpAddress != null
            )
            .ToListAsync(cancellationToken);

        var pollable = candidates.Where(device => device.User != null).ToList();

        if (pollable.Count == 0)
        {
            return;
        }

        var pollResults = await Task.WhenAll(
            pollable.Select(async device => (
                Device: device,
                IsOn: await googleTvService.GetPowerStateAsync(
                    device.Configuration.IpAddress!,
                    cancellationToken
                )
            ))
        );

        var changed = new List<Device>();

        foreach (var (device, isOn) in pollResults)
        {
            if (device.IsOn == isOn)
            {
                continue;
            }

            device.IsOn = isOn;
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
                "Estado de energia do dispositivo {DeviceId} mudou para {Status}",
                device.Id,
                device.IsOn ? "ligado" : "desligado"
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
