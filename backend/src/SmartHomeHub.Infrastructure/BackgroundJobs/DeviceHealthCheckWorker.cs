using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using SmartHomeHub.Application.Common.Devices;
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
        var notificationService =
            scope.ServiceProvider.GetRequiredService<IRealtimeNotificationService>();

        // Configuration.IpAddress não é traduzível pro SQL (propriedade
        // escalar convertida via ValueConverter para jsonb, não mais um
        // Owned Type via ToJson — ver backend/docs/architecture.md) — essa
        // parte do filtro só pode acontecer em memória, depois de
        // materializar (abaixo). Mas a parcela de IsNetworkProbeable() que
        // depende só de IntegrationType (nunca de Configuration) não precisa
        // esperar isso — filtrada aqui no SQL via NonProbeableIntegrationTypes,
        // reduzindo o volume trazido do banco antes do filtro residual em
        // memória (ver backend/docs/database-iot.md).
        var candidates = await dbContext
            .Devices.Include(device => device.User)
            .Include(device => device.Room)
            .Include(device => device.LiveState)
            .Where(device =>
                !IntegrationTypeExtensions.NonProbeableIntegrationTypes.Contains(
                    device.IntegrationType
                )
            )
            .ToListAsync(cancellationToken);

        var probeable = candidates
            .Where(device =>
                device.User != null
                && device.IntegrationType.IsNetworkProbeable()
                && device.Configuration.IpAddress != null
            )
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
            if (DeviceConnectivityUpdater.ApplyConnectivityChange(dbContext, device, isOnline))
            {
                changed.Add(device);
            }
        }

        if (changed.Count == 0)
        {
            return;
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
