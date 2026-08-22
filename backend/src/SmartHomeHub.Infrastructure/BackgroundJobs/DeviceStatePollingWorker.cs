using System.Collections.Concurrent;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using SmartHomeHub.Application.Common.Extensions;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Application.Features.Devices.Common;
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
    private static readonly DeviceMediaStateDto EmptyMediaState = new(0, false, null, null);

    // Volume/mídia são estado live (não persistido no Postgres, ao contrário de
    // IsOn/IsOnline) — o último valor conhecido fica só em memória, aqui, pra
    // detectar delta entre ciclos. Perder esse cache num restart custa no máximo
    // uma notificação extra no próximo ciclo, sem problema de correção.
    private readonly ConcurrentDictionary<Guid, DeviceMediaStateDto> _lastKnownMediaState = new();

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

        if (changed.Count > 0)
        {
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

        await PollMediaStateAsync(pollResults, notificationService, cancellationToken);
    }

    private async Task PollMediaStateAsync(
        (Device Device, bool IsOn)[] pollResults,
        IRealtimeNotificationService notificationService,
        CancellationToken cancellationToken
    )
    {
        var adbControllable = pollResults
            .Where(result => result.Device.IntegrationType.IsAdbControllable())
            .ToList();

        if (adbControllable.Count == 0)
        {
            return;
        }

        var mediaResults = await Task.WhenAll(
            adbControllable.Select(async result =>
            {
                var mediaState = result.IsOn
                    ? await FetchMediaStateAsync(result.Device.Configuration.IpAddress!, cancellationToken)
                    : EmptyMediaState;

                return (result.Device, MediaState: mediaState);
            })
        );

        foreach (var (device, mediaState) in mediaResults)
        {
            var lastKnown = _lastKnownMediaState.GetValueOrDefault(device.Id);

            if (lastKnown == mediaState)
            {
                continue;
            }

            _lastKnownMediaState[device.Id] = mediaState;

            logger.LogInformation("Estado de mídia do dispositivo {DeviceId} mudou.", device.Id);

            await notificationService.NotifyDeviceMediaChangedAsync(
                device.User.ExternalAuthUid,
                device.Id,
                mediaState,
                cancellationToken
            );
        }
    }

    private async Task<DeviceMediaStateDto> FetchMediaStateAsync(
        string ipAddress,
        CancellationToken cancellationToken
    )
    {
        var volumeTask = googleTvService.GetVolumePercentAsync(ipAddress, cancellationToken);
        var mediaTask = googleTvService.GetMediaSessionInfoAsync(ipAddress, cancellationToken);

        await Task.WhenAll(volumeTask, mediaTask);

        var media = mediaTask.Result;
        return new DeviceMediaStateDto(volumeTask.Result, media?.IsPlaying ?? false, media?.Title, media?.Artist);
    }
}
