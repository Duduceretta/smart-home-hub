using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using NSubstitute;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Domain.Entities;
using SmartHomeHub.Domain.Enums;
using SmartHomeHub.Domain.ValueObjects;
using SmartHomeHub.Infrastructure.BackgroundJobs;
using SmartHomeHub.IntegrationTests.Setup;
using Xunit;

namespace SmartHomeHub.IntegrationTests.Features.Devices.HealthCheck;

public class DeviceHealthCheckWorkerTests(IntegrationTestWebAppFactory factory)
    : BaseIntegrationTest(factory)
{
    private readonly TestDeviceProbeService _probeService =
        factory.Services.GetRequiredService<TestDeviceProbeService>();
    private readonly IRealtimeNotificationService _notificationService =
        factory.Services.GetRequiredService<IRealtimeNotificationService>();

    private DeviceHealthCheckWorker CreateWorker() =>
        new(
            Factory.Services.GetRequiredService<IServiceScopeFactory>(),
            _probeService,
            Factory.Services.GetRequiredService<ILogger<DeviceHealthCheckWorker>>()
        );

    private void Reset()
    {
        _probeService.Reset();
        _notificationService.ClearReceivedCalls();
    }

    private async Task<User> SeedUserAsync()
    {
        var user = new User
        {
            Name = "Health Check User",
            ExternalAuthUid = $"uid-{Guid.NewGuid()}",
        };
        DbContext.Users.Add(user);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);
        return user;
    }

    [Fact]
    public async Task RunHealthCheckCycle_WhenDeviceGoesOffline_ShouldUpdateStatusAndNotifyOnce()
    {
        Reset();

        var user = await SeedUserAsync();
        const string ipAddress = "192.168.1.201";
        var device = new Device
        {
            UserId = user.Id,
            Name = "Chromecast Quarto",
            Brand = "Google",
            ExternalId = "CAST-OFFLINE-001",
            Type = DeviceType.Television,
            IntegrationType = IntegrationType.GoogleCast,
            Configuration = new NetworkDeviceConfiguration { IpAddress = ipAddress },
            LiveState = new DeviceLiveState { IsOnline = true },
        };
        DbContext.Devices.Add(device);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        _probeService.SetResult(ipAddress, false);

        await CreateWorker().RunHealthCheckCycleAsync(TestContext.Current.CancellationToken);

        var updated = await DbContext
            .Devices.AsNoTracking()
            .Include(d => d.LiveState)
            .FirstAsync(d => d.Id == device.Id, TestContext.Current.CancellationToken);
        updated.LiveState!.IsOnline.Should().BeFalse();

        await _notificationService
            .Received(1)
            .NotifyDeviceStatusChangedAsync(
                user.ExternalAuthUid,
                device.Id,
                Arg.Any<bool>(),
                Arg.Is(false),
                Arg.Any<CancellationToken>()
            );
    }

    [Fact]
    public async Task RunHealthCheckCycle_WhenStatusUnchanged_ShouldNotNotify()
    {
        Reset();

        var user = await SeedUserAsync();
        const string ipAddress = "192.168.1.202";
        var device = new Device
        {
            UserId = user.Id,
            Name = "Chromecast Sala",
            Brand = "Google",
            ExternalId = "CAST-UNCHANGED-001",
            Type = DeviceType.Television,
            IntegrationType = IntegrationType.GoogleCast,
            Configuration = new NetworkDeviceConfiguration { IpAddress = ipAddress },
            LiveState = new DeviceLiveState { IsOnline = true },
        };
        DbContext.Devices.Add(device);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        _probeService.SetResult(ipAddress, true);

        await CreateWorker().RunHealthCheckCycleAsync(TestContext.Current.CancellationToken);

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
    public async Task RunHealthCheckCycle_ForMqttManagedDevice_ShouldSkipProbe()
    {
        Reset();

        var user = await SeedUserAsync();
        const string ipAddress = "192.168.1.203";
        var device = new Device
        {
            UserId = user.Id,
            Name = "Sensor MQTT",
            Brand = "ESPHome",
            ExternalId = "MQTT-SKIP-001",
            Type = DeviceType.Sensor,
            IntegrationType = IntegrationType.NativeMqtt,
            Configuration = new MqttDeviceConfiguration { IpAddress = ipAddress },
            LiveState = new DeviceLiveState { IsOnline = false },
        };
        DbContext.Devices.Add(device);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        _probeService.SetResult(ipAddress, true);

        await CreateWorker().RunHealthCheckCycleAsync(TestContext.Current.CancellationToken);

        _probeService.CallCount.Should().Be(0);
    }
}
