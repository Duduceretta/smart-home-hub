using System.Collections.Concurrent;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using SmartHomeHub.Application.Common.Extensions;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Application.Features.Dashboards.ActivityLog;
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

    // TVs não expõem uma API de consumo real via ADB/Cast/WebOS — só
    // ligado/desligado, mídia e volume. Sem um sensor de energia físico
    // (ex: tomada inteligente) não tem como medir o Watts real, então
    // estimamos com base na potência média típica de uma Smart TV
    // (fabricante costuma informar ~100-150W em uso, ~0W em standby real
    // desligada via relé). Todo log gerado aqui é marcado IsEstimated=true
    // pra não ser confundido com leitura de sensor.
    private const double EstimatedTvWattsOn = 120.0;
    private const double EstimatedTvWattsOff = 0.0;

    // Volume/mídia são estado live (não persistido no Postgres, ao contrário de
    // IsOn/IsOnline) — o último valor conhecido fica só em memória, aqui, pra
    // detectar delta entre ciclos. Perder esse cache num restart custa no máximo
    // uma notificação extra no próximo ciclo, sem problema de correção.
    private readonly ConcurrentDictionary<Guid, DeviceMediaStateDto> _lastKnownMediaState = new();

    // Mesmo princípio acima, chaveado por UserId — o playback do Spotify é da
    // conta do usuário, não de um Device específico.
    private readonly ConcurrentDictionary<Guid, DeviceMediaStateDto> _lastKnownSpotifyState = new();

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
            .Include(device => device.Room)
            .Where(device =>
                device.Type == DeviceType.Television && device.Configuration.IpAddress != null
            )
            .ToListAsync(cancellationToken);

        var pollable = candidates.Where(device => device.User != null).ToList();

        // O early-return de "nenhuma TV" não pode pular o polling do Spotify —
        // são fontes de mídia independentes (usuário pode só ter Spotify conectado,
        // sem nenhuma TV cadastrada).
        if (pollable.Count > 0)
        {
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
                foreach (var device in changed)
                {
                    var (title, description) = ActivityLogMessages.DeviceStatusChanged(
                        device.Name,
                        device.Room?.Name,
                        device.IsOn,
                        device.IsOnline
                    );

                    dbContext.SystemEvents.Add(
                        new SystemEvent
                        {
                            UserId = device.UserId,
                            DeviceId = device.Id,
                            EventType = ActivityEventTypes.DeviceStatus,
                            Title = title,
                            Description = description,
                            Timestamp = DateTimeOffset.UtcNow,
                        }
                    );
                }
            }

            var nowUtc = DateTimeOffset.UtcNow;

            foreach (var (device, isOn) in pollResults)
            {
                dbContext.DeviceTelemetryLogs.Add(
                    new DeviceTelemetryLog
                    {
                        DeviceId = device.Id,
                        Timestamp = nowUtc,
                        IsOn = isOn,
                        PowerUsageWatts = isOn ? EstimatedTvWattsOn : EstimatedTvWattsOff,
                        IsEstimated = true,
                    }
                );
            }

            await dbContext.SaveChangesAsync(cancellationToken);

            if (changed.Count > 0)
            {
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

            await PollMediaStateAsync(pollResults, dbContext, notificationService, cancellationToken);
        }

        await PollSpotifyStateAsync(scope, dbContext, notificationService, cancellationToken);
    }

    private async Task PollSpotifyStateAsync(
        IServiceScope scope,
        IAppDbContext dbContext,
        IRealtimeNotificationService notificationService,
        CancellationToken cancellationToken
    )
    {
        var integrations = await dbContext
            .SpotifyIntegrations.Include(integration => integration.User)
            .ToListAsync(cancellationToken);

        if (integrations.Count == 0)
        {
            return;
        }

        var spotifyMediaService = scope.ServiceProvider.GetRequiredService<ISpotifyMediaService>();

        var results = await Task.WhenAll(
            integrations.Select(async integration => (
                integration.User,
                MediaState: await spotifyMediaService.GetCurrentPlaybackAsync(
                    integration.User.ExternalAuthUid,
                    cancellationToken
                ) ?? EmptyMediaState
            ))
        );

        foreach (var (user, mediaState) in results)
        {
            var lastKnown = _lastKnownSpotifyState.GetValueOrDefault(user.Id);

            if (lastKnown == mediaState)
            {
                continue;
            }

            _lastKnownSpotifyState[user.Id] = mediaState;

            logger.LogInformation("Estado de playback do Spotify mudou para {UserId}.", user.Id);

            if (!string.IsNullOrWhiteSpace(mediaState.Title) && mediaState.Title != lastKnown?.Title)
            {
                var (title, description) = ActivityLogMessages.SpotifyPlaybackChanged(
                    mediaState.IsPlaying,
                    mediaState.Title,
                    mediaState.Artist
                );

                dbContext.SystemEvents.Add(
                    new SystemEvent
                    {
                        UserId = user.Id,
                        DeviceId = null,
                        EventType = ActivityEventTypes.Spotify,
                        Title = title,
                        Description = description,
                        Timestamp = DateTimeOffset.UtcNow,
                    }
                );
            }

            await notificationService.NotifySpotifyPlaybackChangedAsync(
                user.ExternalAuthUid,
                mediaState,
                cancellationToken
            );
        }

        // Um único save após o loop em vez de um round-trip por item mudado —
        // SaveChangesAsync é barato quando não há entradas pendentes (EF checa
        // o ChangeTracker antes de tocar o banco).
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    private async Task PollMediaStateAsync(
        (Device Device, bool IsOn)[] pollResults,
        IAppDbContext dbContext,
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

            if (!string.IsNullOrWhiteSpace(mediaState.Title) && mediaState.Title != lastKnown?.Title)
            {
                var (title, description) = ActivityLogMessages.DeviceMediaChanged(
                    mediaState.Title,
                    mediaState.Artist
                );

                dbContext.SystemEvents.Add(
                    new SystemEvent
                    {
                        UserId = device.UserId,
                        DeviceId = device.Id,
                        EventType = ActivityEventTypes.DeviceMedia,
                        Title = title,
                        Description = description,
                        Timestamp = DateTimeOffset.UtcNow,
                    }
                );
            }

            await notificationService.NotifyDeviceMediaChangedAsync(
                device.User.ExternalAuthUid,
                device.Id,
                mediaState,
                cancellationToken
            );
        }

        await dbContext.SaveChangesAsync(cancellationToken);
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
