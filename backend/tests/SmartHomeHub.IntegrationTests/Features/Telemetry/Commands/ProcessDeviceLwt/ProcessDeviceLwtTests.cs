using FluentAssertions;
using Mediator;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using NSubstitute;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Application.Features.Telemetry.Commands.ProcessDeviceLwt;
using SmartHomeHub.Domain.Entities;
using SmartHomeHub.Domain.Enums;
using SmartHomeHub.Domain.ValueObjects;
using SmartHomeHub.IntegrationTests.Setup;

namespace SmartHomeHub.IntegrationTests.Features.Telemetry.Commands.ProcessDeviceLwt;

// Cobre o item da auditoria de resiliência MQTT: LWT individual publicado
// sozinho por firmware Tasmota/ESPHome em home/status/{externalId} — caminho
// ADICIONAL de detecção de offline mais rápido que o polling do
// DeviceHealthCheckWorker (~12s), não substituto.
public class ProcessDeviceLwtTests(IntegrationTestWebAppFactory factory)
    : BaseIntegrationTest(factory)
{
    private readonly IRealtimeNotificationService _notificationService =
        factory.Services.GetRequiredService<IRealtimeNotificationService>();

    private async Task<(User user, Device device)> SeedOnlineDeviceAsync()
    {
        var user = new User { Name = "LWT User", ExternalAuthUid = $"uid-{Guid.NewGuid()}" };

        var device = new Device
        {
            UserId = user.Id,
            Name = "Tomada Cozinha",
            Brand = "Sonoff",
            ExternalId = $"MAC-LWT-{Guid.NewGuid():N}",
            Type = DeviceType.Switch,
            IntegrationType = IntegrationType.NativeMqtt,
            Configuration = new MqttDeviceConfiguration(),
            LiveState = new DeviceLiveState { IsOnline = true, IsOn = true },
        };

        user.Devices.Add(device);
        DbContext.Users.Add(user);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        return (user, device);
    }

    [Fact]
    public async Task ProcessDeviceLwt_WithOfflinePayload_ShouldMarkDeviceOfflineAndNotifyImmediately()
    {
        // Arrange
        _notificationService.ClearReceivedCalls();
        var (user, device) = await SeedOnlineDeviceAsync();

        var command = new ProcessDeviceLwtCommand(
            Topic: $"home/status/{device.ExternalId}",
            Payload: "Offline"
        );

        using var scope = Factory.Services.CreateScope();
        var mediator = scope.ServiceProvider.GetRequiredService<IMediator>();

        // Act
        var result = await mediator.Send(command, TestContext.Current.CancellationToken);

        // Assert
        result.IsSuccess.Should().BeTrue();

        DbContext.ChangeTracker.Clear();
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

        var systemEvent = await DbContext.SystemEvents.FirstOrDefaultAsync(
            e => e.DeviceId == device.Id,
            TestContext.Current.CancellationToken
        );
        systemEvent
            .Should()
            .NotBeNull(
                "o mesmo caminho de SystemEvent do health check deve ser usado, não duplicado."
            );
        systemEvent!.IsAlert.Should().BeTrue();
    }

    [Fact]
    public async Task ProcessDeviceLwt_WithOnlinePayload_ShouldMarkDeviceOnline()
    {
        // Arrange — dispositivo começa offline, LWT anuncia volta.
        _notificationService.ClearReceivedCalls();
        var user = new User { Name = "LWT User 2", ExternalAuthUid = $"uid-{Guid.NewGuid()}" };
        var device = new Device
        {
            UserId = user.Id,
            Name = "Sensor Sala",
            Brand = "ESPHome",
            ExternalId = $"MAC-LWT-{Guid.NewGuid():N}",
            Type = DeviceType.Sensor,
            IntegrationType = IntegrationType.NativeMqtt,
            Configuration = new MqttDeviceConfiguration(),
            LiveState = new DeviceLiveState { IsOnline = false },
        };
        user.Devices.Add(device);
        DbContext.Users.Add(user);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        var command = new ProcessDeviceLwtCommand($"home/status/{device.ExternalId}", "Online");

        using var scope = Factory.Services.CreateScope();
        var mediator = scope.ServiceProvider.GetRequiredService<IMediator>();

        // Act
        var result = await mediator.Send(command, TestContext.Current.CancellationToken);

        // Assert
        result.IsSuccess.Should().BeTrue();

        DbContext.ChangeTracker.Clear();
        var updated = await DbContext
            .Devices.AsNoTracking()
            .Include(d => d.LiveState)
            .FirstAsync(d => d.Id == device.Id, TestContext.Current.CancellationToken);

        updated.LiveState!.IsOnline.Should().BeTrue();
    }

    [Fact]
    public async Task ProcessDeviceLwt_WhenAlreadyInRequestedState_ShouldBeIdempotentAndNotNotify()
    {
        // Arrange — já está online, LWT "Online" repetido não deve gerar
        // SystemEvent nem notificação duplicada.
        _notificationService.ClearReceivedCalls();
        var (_, device) = await SeedOnlineDeviceAsync();

        var command = new ProcessDeviceLwtCommand($"home/status/{device.ExternalId}", "Online");

        using var scope = Factory.Services.CreateScope();
        var mediator = scope.ServiceProvider.GetRequiredService<IMediator>();

        // Act
        var result = await mediator.Send(command, TestContext.Current.CancellationToken);

        // Assert
        result.IsSuccess.Should().BeTrue();
        await _notificationService
            .DidNotReceive()
            .NotifyDeviceStatusChangedAsync(
                Arg.Any<string>(),
                Arg.Any<Guid>(),
                Arg.Any<bool>(),
                Arg.Any<bool>(),
                Arg.Any<CancellationToken>()
            );
    }

    [Fact]
    public async Task ProcessDeviceLwt_UnknownDevice_ShouldReturnFailure()
    {
        var command = new ProcessDeviceLwtCommand("home/status/MAC-DESCONHECIDO", "Offline");

        using var scope = Factory.Services.CreateScope();
        var mediator = scope.ServiceProvider.GetRequiredService<IMediator>();

        var result = await mediator.Send(command, TestContext.Current.CancellationToken);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("Device.NotFound");
    }

    [Fact]
    public async Task ProcessDeviceLwt_InvalidTopicFormat_ShouldReturnFailure()
    {
        var command = new ProcessDeviceLwtCommand("topico/aleatorio/invalido", "Offline");

        using var scope = Factory.Services.CreateScope();
        var mediator = scope.ServiceProvider.GetRequiredService<IMediator>();

        var result = await mediator.Send(command, TestContext.Current.CancellationToken);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("Mqtt.InvalidTopic");
    }

    [Fact]
    public async Task ProcessDeviceLwt_UnrecognizedPayload_ShouldReturnFailure()
    {
        var (_, device) = await SeedOnlineDeviceAsync();
        var command = new ProcessDeviceLwtCommand($"home/status/{device.ExternalId}", "garbage");

        using var scope = Factory.Services.CreateScope();
        var mediator = scope.ServiceProvider.GetRequiredService<IMediator>();

        var result = await mediator.Send(command, TestContext.Current.CancellationToken);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("Lwt.InvalidPayload");
    }
}
