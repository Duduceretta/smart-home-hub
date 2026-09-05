using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using NSubstitute;
using NSubstitute.ClearExtensions;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Application.Features.Devices.Common;
using SmartHomeHub.Domain.Entities;
using SmartHomeHub.Domain.Enums;
using SmartHomeHub.Domain.ValueObjects;
using SmartHomeHub.Infrastructure.BackgroundJobs;
using SmartHomeHub.IntegrationTests.Setup;
using Xunit;

namespace SmartHomeHub.IntegrationTests.Features.Devices.PowerState;

public class DeviceStatePollingWorkerTests(IntegrationTestWebAppFactory factory)
    : BaseIntegrationTest(factory)
{
    private readonly IGoogleTvService _googleTvService =
        factory.Services.GetRequiredService<IGoogleTvService>();
    private readonly ISpotifyMediaService _spotifyMediaService =
        factory.Services.GetRequiredService<ISpotifyMediaService>();
    private readonly IRealtimeNotificationService _notificationService =
        factory.Services.GetRequiredService<IRealtimeNotificationService>();

    private DeviceStatePollingWorker CreateWorker() =>
        new(
            Factory.Services.GetRequiredService<IServiceScopeFactory>(),
            _googleTvService,
            Factory.Services.GetRequiredService<ILogger<DeviceStatePollingWorker>>()
        );

    private void Reset()
    {
        _googleTvService.ClearSubstitute();
        _spotifyMediaService.ClearSubstitute();
        _notificationService.ClearReceivedCalls();
    }

    private async Task<User> SeedUserAsync()
    {
        var user = new User
        {
            Name = "Power State User",
            ExternalAuthUid = $"uid-{Guid.NewGuid()}",
        };
        DbContext.Users.Add(user);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);
        return user;
    }

    [Fact]
    public async Task RunPollingCycle_WhenTvTurnsOnViaRemote_ShouldUpdateStatusAndNotifyOnce()
    {
        Reset();

        var user = await SeedUserAsync();
        const string ipAddress = "192.168.1.211";
        var device = new Device
        {
            UserId = user.Id,
            Name = "Android TV Sala",
            Brand = "Sony",
            ExternalId = "ADB-POLL-001",
            Type = DeviceType.Television,
            IntegrationType = IntegrationType.AndroidTvAdb,
            Configuration = new NetworkDeviceConfiguration { IpAddress = ipAddress },
            LiveState = new DeviceLiveState { IsOn = false, IsOnline = true },
        };
        DbContext.Devices.Add(device);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        _googleTvService.GetPowerStateAsync(ipAddress, Arg.Any<CancellationToken>()).Returns(true);

        await CreateWorker().RunPollingCycleAsync(TestContext.Current.CancellationToken);

        var updated = await DbContext
            .Devices.AsNoTracking()
            .Include(d => d.LiveState)
            .FirstAsync(d => d.Id == device.Id, TestContext.Current.CancellationToken);
        updated.LiveState!.IsOn.Should().BeTrue();

        await _notificationService
            .Received(1)
            .NotifyDeviceStatusChangedAsync(
                user.ExternalAuthUid,
                device.Id,
                Arg.Is(true),
                Arg.Any<bool>(),
                Arg.Any<CancellationToken>()
            );
    }

    [Fact]
    public async Task RunPollingCycle_WhenStatusUnchanged_ShouldNotNotify()
    {
        Reset();

        var user = await SeedUserAsync();
        const string ipAddress = "192.168.1.212";
        var device = new Device
        {
            UserId = user.Id,
            Name = "Android TV Quarto",
            Brand = "Sony",
            ExternalId = "ADB-POLL-002",
            Type = DeviceType.Television,
            IntegrationType = IntegrationType.AndroidTvAdb,
            Configuration = new NetworkDeviceConfiguration { IpAddress = ipAddress },
            LiveState = new DeviceLiveState { IsOn = true, IsOnline = true },
        };
        DbContext.Devices.Add(device);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        _googleTvService.GetPowerStateAsync(ipAddress, Arg.Any<CancellationToken>()).Returns(true);

        await CreateWorker().RunPollingCycleAsync(TestContext.Current.CancellationToken);

        await _notificationService
            .DidNotReceive()
            .NotifyDeviceStatusChangedAsync(
                Arg.Any<string>(),
                device.Id,
                Arg.Any<bool>(),
                Arg.Any<bool>(),
                Arg.Any<CancellationToken>()
            );
    }

    [Fact]
    public async Task RunPollingCycle_ForNonTelevisionDevice_ShouldSkipPolling()
    {
        Reset();

        var user = await SeedUserAsync();
        const string ipAddress = "192.168.1.213";
        var device = new Device
        {
            UserId = user.Id,
            Name = "Sensor Genérico",
            Brand = "ESPHome",
            ExternalId = "SENSOR-POLL-001",
            Type = DeviceType.Sensor,
            IntegrationType = IntegrationType.EspHomeMqtt,
            Configuration = new MqttDeviceConfiguration { IpAddress = ipAddress },
            LiveState = new DeviceLiveState { IsOn = false, IsOnline = true },
        };
        DbContext.Devices.Add(device);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        _googleTvService.GetPowerStateAsync(ipAddress, Arg.Any<CancellationToken>()).Returns(true);

        await CreateWorker().RunPollingCycleAsync(TestContext.Current.CancellationToken);

        await _googleTvService
            .DidNotReceive()
            .GetPowerStateAsync(ipAddress, Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task RunPollingCycle_WhenAndroidTvIsOnWithMediaPlaying_ShouldNotifyMediaChangedOnce()
    {
        Reset();

        var user = await SeedUserAsync();
        const string ipAddress = "192.168.1.214";
        var device = new Device
        {
            UserId = user.Id,
            Name = "Android TV Cozinha",
            Brand = "Sony",
            ExternalId = "ADB-MEDIA-001",
            Type = DeviceType.Television,
            IntegrationType = IntegrationType.AndroidTvAdb,
            Configuration = new NetworkDeviceConfiguration { IpAddress = ipAddress },
            LiveState = new DeviceLiveState { IsOn = true, IsOnline = true },
        };
        DbContext.Devices.Add(device);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        _googleTvService.GetPowerStateAsync(ipAddress, Arg.Any<CancellationToken>()).Returns(true);
        _googleTvService.GetVolumePercentAsync(ipAddress, Arg.Any<CancellationToken>()).Returns(60);
        _googleTvService
            .GetMediaSessionInfoAsync(ipAddress, Arg.Any<CancellationToken>())
            .Returns(new MediaSessionInfo("Some Video", "Some Channel", true));

        await CreateWorker().RunPollingCycleAsync(TestContext.Current.CancellationToken);

        await _notificationService
            .Received(1)
            .NotifyDeviceMediaChangedAsync(
                user.ExternalAuthUid,
                device.Id,
                Arg.Is<DeviceMediaStateDto>(state =>
                    state != null
                    && state.VolumePercent == 60
                    && state.IsPlaying
                    && state.Title == "Some Video"
                    && state.Artist == "Some Channel"
                ),
                Arg.Any<CancellationToken>()
            );
    }

    [Fact]
    public async Task RunPollingCycle_WhenMediaStateUnchangedAcrossCycles_ShouldNotifyOnlyOnce()
    {
        Reset();

        var user = await SeedUserAsync();
        const string ipAddress = "192.168.1.215";
        var device = new Device
        {
            UserId = user.Id,
            Name = "Android TV Escritório",
            Brand = "Sony",
            ExternalId = "ADB-MEDIA-002",
            Type = DeviceType.Television,
            IntegrationType = IntegrationType.AndroidTvAdb,
            Configuration = new NetworkDeviceConfiguration { IpAddress = ipAddress },
            LiveState = new DeviceLiveState { IsOn = true, IsOnline = true },
        };
        DbContext.Devices.Add(device);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        _googleTvService.GetPowerStateAsync(ipAddress, Arg.Any<CancellationToken>()).Returns(true);
        _googleTvService.GetVolumePercentAsync(ipAddress, Arg.Any<CancellationToken>()).Returns(60);
        _googleTvService
            .GetMediaSessionInfoAsync(ipAddress, Arg.Any<CancellationToken>())
            .Returns(new MediaSessionInfo("Some Video", "Some Channel", true));

        var worker = CreateWorker();
        await worker.RunPollingCycleAsync(TestContext.Current.CancellationToken);

        _notificationService.ClearReceivedCalls();

        await worker.RunPollingCycleAsync(TestContext.Current.CancellationToken);

        await _notificationService
            .DidNotReceive()
            .NotifyDeviceMediaChangedAsync(
                Arg.Any<string>(),
                device.Id,
                Arg.Any<DeviceMediaStateDto>(),
                Arg.Any<CancellationToken>()
            );
    }

    [Fact]
    public async Task RunPollingCycle_WhenAndroidTvTurnsOff_ShouldNotifyZeroedMediaWithoutAdbCalls()
    {
        Reset();

        var user = await SeedUserAsync();
        const string ipAddress = "192.168.1.216";
        var device = new Device
        {
            UserId = user.Id,
            Name = "Android TV Varanda",
            Brand = "Sony",
            ExternalId = "ADB-MEDIA-003",
            Type = DeviceType.Television,
            IntegrationType = IntegrationType.AndroidTvAdb,
            Configuration = new NetworkDeviceConfiguration { IpAddress = ipAddress },
            LiveState = new DeviceLiveState { IsOn = true, IsOnline = true },
        };
        DbContext.Devices.Add(device);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        _googleTvService.GetPowerStateAsync(ipAddress, Arg.Any<CancellationToken>()).Returns(false);

        await CreateWorker().RunPollingCycleAsync(TestContext.Current.CancellationToken);

        await _notificationService
            .Received(1)
            .NotifyDeviceMediaChangedAsync(
                user.ExternalAuthUid,
                device.Id,
                Arg.Is<DeviceMediaStateDto>(state =>
                    state != null
                    && state.VolumePercent == 0
                    && !state.IsPlaying
                    && state.Title == null
                ),
                Arg.Any<CancellationToken>()
            );

        await _googleTvService
            .DidNotReceive()
            .GetVolumePercentAsync(ipAddress, Arg.Any<CancellationToken>());
        await _googleTvService
            .DidNotReceive()
            .GetMediaSessionInfoAsync(ipAddress, Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task RunPollingCycle_ForLgWebOsTv_ShouldNeverCallMediaMethods()
    {
        Reset();

        var user = await SeedUserAsync();
        const string ipAddress = "192.168.1.217";
        var device = new Device
        {
            UserId = user.Id,
            Name = "LG WebOS Sala",
            Brand = "LG",
            ExternalId = "LG-MEDIA-001",
            Type = DeviceType.Television,
            IntegrationType = IntegrationType.LgWebOs,
            Configuration = new NetworkDeviceConfiguration { IpAddress = ipAddress },
            LiveState = new DeviceLiveState { IsOn = false, IsOnline = true },
        };
        DbContext.Devices.Add(device);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        _googleTvService.GetPowerStateAsync(ipAddress, Arg.Any<CancellationToken>()).Returns(true);

        await CreateWorker().RunPollingCycleAsync(TestContext.Current.CancellationToken);

        await _googleTvService
            .DidNotReceive()
            .GetVolumePercentAsync(ipAddress, Arg.Any<CancellationToken>());
        await _googleTvService
            .DidNotReceive()
            .GetMediaSessionInfoAsync(ipAddress, Arg.Any<CancellationToken>());
        await _notificationService
            .DidNotReceive()
            .NotifyDeviceMediaChangedAsync(
                Arg.Any<string>(),
                Arg.Any<Guid>(),
                Arg.Any<DeviceMediaStateDto>(),
                Arg.Any<CancellationToken>()
            );
    }

    [Fact]
    public async Task RunPollingCycle_WhenSpotifyPlaybackChanges_ShouldNotifySpotifyPlaybackChangedOnce()
    {
        Reset();

        var user = await SeedUserAsync();
        DbContext.SpotifyIntegrations.Add(
            new SpotifyIntegration
            {
                UserId = user.Id,
                AccessTokenEncrypted = "enc-access",
                RefreshTokenEncrypted = "enc-refresh",
                ExpiresAtUtc = DateTimeOffset.UtcNow.AddHours(1),
                SpotifyDisplayName = "Test User",
            }
        );
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        _spotifyMediaService
            .GetCurrentPlaybackAsync(user.ExternalAuthUid, Arg.Any<CancellationToken>())
            .Returns(new DeviceMediaStateDto(70, true, "Song", "Artist"));

        await CreateWorker().RunPollingCycleAsync(TestContext.Current.CancellationToken);

        await _notificationService
            .Received(1)
            .NotifySpotifyPlaybackChangedAsync(
                user.ExternalAuthUid,
                Arg.Is<DeviceMediaStateDto>(state =>
                    state != null && state.Title == "Song" && state.VolumePercent == 70
                ),
                Arg.Any<CancellationToken>()
            );
    }

    [Fact]
    public async Task RunPollingCycle_WhenSpotifyPlaybackUnchanged_ShouldNotNotifyOnSecondCycle()
    {
        Reset();

        var user = await SeedUserAsync();
        DbContext.SpotifyIntegrations.Add(
            new SpotifyIntegration
            {
                UserId = user.Id,
                AccessTokenEncrypted = "enc-access",
                RefreshTokenEncrypted = "enc-refresh",
                ExpiresAtUtc = DateTimeOffset.UtcNow.AddHours(1),
                SpotifyDisplayName = "Test User",
            }
        );
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        _spotifyMediaService
            .GetCurrentPlaybackAsync(user.ExternalAuthUid, Arg.Any<CancellationToken>())
            .Returns(new DeviceMediaStateDto(70, true, "Song", "Artist"));

        var worker = CreateWorker();
        await worker.RunPollingCycleAsync(TestContext.Current.CancellationToken);

        _notificationService.ClearReceivedCalls();

        await worker.RunPollingCycleAsync(TestContext.Current.CancellationToken);

        await _notificationService
            .DidNotReceive()
            .NotifySpotifyPlaybackChangedAsync(
                Arg.Any<string>(),
                Arg.Any<DeviceMediaStateDto>(),
                Arg.Any<CancellationToken>()
            );
    }
}
