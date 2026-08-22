using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using NSubstitute;
using NSubstitute.ClearExtensions;
using SmartHomeHub.Application.Common.Interfaces;
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
        _notificationService.ClearReceivedCalls();
    }

    private async Task<User> SeedUserAsync()
    {
        var user = new User { Name = "Power State User", ExternalAuthUid = $"uid-{Guid.NewGuid()}" };
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
            IsOn = false,
            Configuration = new DeviceConfiguration { IpAddress = ipAddress },
        };
        DbContext.Devices.Add(device);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        _googleTvService.GetPowerStateAsync(ipAddress, Arg.Any<CancellationToken>()).Returns(true);

        await CreateWorker().RunPollingCycleAsync(TestContext.Current.CancellationToken);

        var updated = await DbContext
            .Devices.AsNoTracking()
            .FirstAsync(d => d.Id == device.Id, TestContext.Current.CancellationToken);
        updated.IsOn.Should().BeTrue();

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
            IsOn = true,
            Configuration = new DeviceConfiguration { IpAddress = ipAddress },
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
            IsOn = false,
            Configuration = new DeviceConfiguration { IpAddress = ipAddress },
        };
        DbContext.Devices.Add(device);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        _googleTvService.GetPowerStateAsync(ipAddress, Arg.Any<CancellationToken>()).Returns(true);

        await CreateWorker().RunPollingCycleAsync(TestContext.Current.CancellationToken);

        await _googleTvService
            .DidNotReceive()
            .GetPowerStateAsync(ipAddress, Arg.Any<CancellationToken>());
    }
}
