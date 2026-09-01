using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using NSubstitute;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Application.Features.Dashboards.ActivityLog;
using SmartHomeHub.Domain.Common.Constants;
using SmartHomeHub.Application.Features.Devices.Commands.SetDeviceState;
using SmartHomeHub.Application.Features.Devices.Common;
using SmartHomeHub.Application.Features.Telemetry.Commands.ProcessTelemetry;
using SmartHomeHub.Domain.Common.Primitives;
using SmartHomeHub.Domain.Entities;
using SmartHomeHub.Domain.Enums;
using SmartHomeHub.Domain.ValueObjects;
using SmartHomeHub.Infrastructure.BackgroundJobs;
using SmartHomeHub.Infrastructure.Persistence;

namespace SmartHomeHub.UnitTests.Application.Features.History;

public class SystemEventWritersTests
{
    private readonly AppDbContext _dbContext;
    private readonly IRealtimeNotificationService _notificationService = Substitute.For<IRealtimeNotificationService>();
    private readonly IMqttService _mqttService = Substitute.For<IMqttService>();
    private readonly IGoogleTvService _googleTvService = Substitute.For<IGoogleTvService>();
    private readonly IChromecastWakeService _chromecastWakeService = Substitute.For<IChromecastWakeService>();
    private readonly IWakeOnLanService _wakeOnLanService = Substitute.For<IWakeOnLanService>();
    private readonly ITuyaLocalControlService _tuyaService = Substitute.For<ITuyaLocalControlService>();
    private readonly IDeviceProbeService _probeService = Substitute.For<IDeviceProbeService>();
    private readonly ISpotifyMediaService _spotifyMediaService = Substitute.For<ISpotifyMediaService>();
    private readonly Mediator.IPublisher _publisher = Substitute.For<Mediator.IPublisher>();

    public SystemEventWritersTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        _dbContext = new AppDbContext(options);
    }

    [Fact]
    public async Task SetDeviceStateCommandHandler_ShouldWriteSystemEvent_WithCompleteSnapshot_AndUserManualSource()
    {
        // Arrange
        var user = new User { Id = Guid.NewGuid(), ExternalAuthUid = "fb-user-1" };
        var room = new Room { Id = Guid.NewGuid(), Name = "Cozinha", UserId = user.Id };
        var device = new Device
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            RoomId = room.Id,
            Room = room,
            Name = "Cafeteira Inteligente",
            ExternalId = "coffee-maker-01",
            Type = DeviceType.Switch,
            IntegrationType = IntegrationType.NativeMqtt,
            IsOn = false,
            IsOnline = true,
        };

        _dbContext.Users.Add(user);
        _dbContext.Rooms.Add(room);
        _dbContext.Devices.Add(device);
        await _dbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        var handler = new SetDeviceStateCommandHandler(
            _dbContext,
            _mqttService,
            _googleTvService,
            _chromecastWakeService,
            _wakeOnLanService,
            _tuyaService,
            _notificationService
        );

        var command = new SetDeviceStateCommand(
            device.Id,
            user.ExternalAuthUid,
            DesiredState: true,
            TraceId: "trace-test-1",
            Source: EventSource.UserManual
        );

        // Act
        var result = await handler.Handle(command, TestContext.Current.CancellationToken);

        // Assert
        result.IsSuccess.Should().BeTrue();
        var ev = await _dbContext.SystemEvents.FirstOrDefaultAsync(
            e => e.DeviceId == device.Id,
            TestContext.Current.CancellationToken
        );
        ev.Should().NotBeNull();
        ev!.Severity.Should().Be(EventSeverity.Info);
        ev.Source.Should().Be(EventSource.UserManual);
        ev.EventType.Should().Be(SystemEventTypes.StateChange);
        ev.DeviceName.Should().Be("Cafeteira Inteligente");
        ev.RoomId.Should().Be(room.Id);
        ev.RoomName.Should().Be("Cozinha");
        ev.OldValue.Should().Be("off");
        ev.NewValue.Should().Be("on");
    }

    [Fact]
    public async Task ProcessTelemetryCommandHandler_OnStateChange_ShouldWriteSystemEvent_WithSystemSource()
    {
        // Arrange
        var user = new User { Id = Guid.NewGuid(), ExternalAuthUid = "fb-user-2" };
        var room = new Room { Id = Guid.NewGuid(), Name = "Escritório", UserId = user.Id };
        var device = new Device
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            RoomId = room.Id,
            Room = room,
            Name = "Lâmpada Mesa",
            ExternalId = "sonoff-lamp-01",
            Type = DeviceType.Light,
            IntegrationType = IntegrationType.NativeMqtt,
            IsOn = false,
            IsOnline = true,
        };

        _dbContext.Users.Add(user);
        _dbContext.Rooms.Add(room);
        _dbContext.Devices.Add(device);
        await _dbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        var handler = new ProcessTelemetryCommandHandler(_dbContext, _notificationService, _publisher);
        var payload = """{"isOn": true, "powerUsageWatts": 15.0}""";
        var command = new ProcessTelemetryCommand("home/telemetry/sonoff-lamp-01", payload);

        // Act
        var result = await handler.Handle(command, TestContext.Current.CancellationToken);

        // Assert
        result.IsSuccess.Should().BeTrue();
        var ev = await _dbContext.SystemEvents.FirstOrDefaultAsync(
            e => e.DeviceId == device.Id,
            TestContext.Current.CancellationToken
        );
        ev.Should().NotBeNull();
        ev!.Severity.Should().Be(EventSeverity.Info);
        ev.Source.Should().Be(EventSource.System);
        ev.EventType.Should().Be(SystemEventTypes.StateChange);
        ev.DeviceName.Should().Be("Lâmpada Mesa");
        ev.RoomId.Should().Be(room.Id);
        ev.RoomName.Should().Be("Escritório");
        ev.OldValue.Should().Be("off");
        ev.NewValue.Should().Be("on");
    }

    [Fact]
    public async Task DeviceHealthCheckWorker_WhenDeviceGoesOffline_ShouldWriteWarningEvent()
    {
        // Arrange
        var user = new User { Id = Guid.NewGuid(), ExternalAuthUid = "fb-user-3" };
        var room = new Room { Id = Guid.NewGuid(), Name = "Garagem", UserId = user.Id };
        var device = new Device
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            RoomId = room.Id,
            Room = room,
            Name = "Câmera Portão",
            ExternalId = "cam-01",
            Type = DeviceType.Camera,
            IntegrationType = IntegrationType.GoogleCast,
            IsOnline = true,
            Configuration = new DeviceConfiguration { IpAddress = "192.168.1.50" },
        };

        _dbContext.Users.Add(user);
        _dbContext.Rooms.Add(room);
        _dbContext.Devices.Add(device);
        await _dbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        _probeService
            .ProbeDeviceAsync(
                Arg.Any<string>(),
                Arg.Any<IntegrationType>(),
                Arg.Any<CancellationToken>()
            )
            .Returns(false);

        var serviceProvider = Substitute.For<IServiceProvider>();
        serviceProvider.GetService(typeof(IAppDbContext)).Returns(_dbContext);
        serviceProvider.GetService(typeof(IRealtimeNotificationService)).Returns(_notificationService);

        var scope = Substitute.For<IServiceScope>();
        scope.ServiceProvider.Returns(serviceProvider);

        var scopeFactory = Substitute.For<IServiceScopeFactory>();
        scopeFactory.CreateScope().Returns(scope);

        var worker = new DeviceHealthCheckWorker(
            scopeFactory,
            _probeService,
            Substitute.For<ILogger<DeviceHealthCheckWorker>>()
        );

        // Act
        await worker.RunHealthCheckCycleAsync(TestContext.Current.CancellationToken);

        // Assert
        var ev = await _dbContext.SystemEvents.FirstOrDefaultAsync(
            e => e.DeviceId == device.Id,
            TestContext.Current.CancellationToken
        );
        ev.Should().NotBeNull();
        ev!.Severity.Should().Be(EventSeverity.Warning);
        ev.Source.Should().Be(EventSource.System);
        ev.EventType.Should().Be(SystemEventTypes.DeviceOffline);
        ev.DeviceName.Should().Be("Câmera Portão");
        ev.RoomName.Should().Be("Garagem");
        ev.OldValue.Should().Be("online");
        ev.NewValue.Should().Be("offline");
        ev.IsAlert.Should().BeTrue();
    }

    [Fact]
    public async Task DeviceStatePollingWorker_SpotifyPlayback_ShouldWriteMediaPlaybackEvent_WithFormattedDescription()
    {
        // Arrange
        var user = new User { Id = Guid.NewGuid(), ExternalAuthUid = "fb-spotify-user" };
        var integration = new SpotifyIntegration
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            User = user,
            AccessTokenEncrypted = "tok",
            RefreshTokenEncrypted = "ref",
            ExpiresAtUtc = DateTimeOffset.UtcNow.AddHours(1),
            SpotifyDisplayName = "Spotify Account",
            CreatedAt = DateTimeOffset.UtcNow,
        };

        _dbContext.Users.Add(user);
        _dbContext.SpotifyIntegrations.Add(integration);
        await _dbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        _spotifyMediaService
            .GetCurrentPlaybackAsync(user.ExternalAuthUid, Arg.Any<CancellationToken>())
            .Returns(new DeviceMediaStateDto(50, true, "Bohemian Rhapsody", "Queen"));

        var serviceProvider = Substitute.For<IServiceProvider>();
        serviceProvider.GetService(typeof(IAppDbContext)).Returns(_dbContext);
        serviceProvider.GetService(typeof(IRealtimeNotificationService)).Returns(_notificationService);
        serviceProvider.GetService(typeof(ISpotifyMediaService)).Returns(_spotifyMediaService);

        var scope = Substitute.For<IServiceScope>();
        scope.ServiceProvider.Returns(serviceProvider);

        var scopeFactory = Substitute.For<IServiceScopeFactory>();
        scopeFactory.CreateScope().Returns(scope);

        var worker = new DeviceStatePollingWorker(
            scopeFactory,
            _googleTvService,
            Substitute.For<ILogger<DeviceStatePollingWorker>>()
        );

        // Act
        await worker.RunPollingCycleAsync(TestContext.Current.CancellationToken);

        // Assert
        var ev = await _dbContext.SystemEvents.FirstOrDefaultAsync(
            e => e.UserId == user.Id && e.EventType == SystemEventTypes.MediaPlayback,
            TestContext.Current.CancellationToken
        );
        ev.Should().NotBeNull();
        ev!.Severity.Should().Be(EventSeverity.Info);
        ev.Source.Should().Be(EventSource.System);
        ev.EventType.Should().Be(SystemEventTypes.MediaPlayback);
        ev.DeviceName.Should().Be("Spotify");
        ev.Description.Should().Be("Tocando: Bohemian Rhapsody — Queen");
        ev.NewValue.Should().Be("Bohemian Rhapsody");
    }

    [Fact]
    public async Task SystemEventSnapshot_ShouldRemainImmutable_WhenDeviceIsRenamedLater()
    {
        // Arrange
        var user = new User { Id = Guid.NewGuid(), ExternalAuthUid = "fb-user-immutability" };
        var room1 = new Room { Id = Guid.NewGuid(), Name = "Sala de Estar", UserId = user.Id };
        var room2 = new Room { Id = Guid.NewGuid(), Name = "Quarto Principal", UserId = user.Id };
        var device = new Device
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            RoomId = room1.Id,
            Room = room1,
            Name = "Lâmpada Original",
            ExternalId = "light-immutable-01",
            Type = DeviceType.Light,
            IntegrationType = IntegrationType.NativeMqtt,
            IsOn = false,
            IsOnline = true,
        };

        _dbContext.Users.Add(user);
        _dbContext.Rooms.AddRange(room1, room2);
        _dbContext.Devices.Add(device);
        await _dbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        var handler = new SetDeviceStateCommandHandler(
            _dbContext,
            _mqttService,
            _googleTvService,
            _chromecastWakeService,
            _wakeOnLanService,
            _tuyaService,
            _notificationService
        );

        // Act 1: Record initial state change
        await handler.Handle(
            new SetDeviceStateCommand(device.Id, user.ExternalAuthUid, true, "trace-immutability-1"),
            TestContext.Current.CancellationToken
        );

        var originalEvent = await _dbContext
            .SystemEvents.AsNoTracking()
            .FirstOrDefaultAsync(
                e => e.DeviceId == device.Id,
                TestContext.Current.CancellationToken
            );
        originalEvent.Should().NotBeNull();
        originalEvent!.DeviceName.Should().Be("Lâmpada Original");
        originalEvent.RoomName.Should().Be("Sala de Estar");

        // Act 2: Rename device and change its room
        device.Name = "Lâmpada Nova Renomeada";
        device.RoomId = room2.Id;
        device.Room = room2;
        await _dbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        // Assert: Historical event's snapshot properties must remain completely untouched
        var historicalEvent = await _dbContext
            .SystemEvents.AsNoTracking()
            .FirstOrDefaultAsync(
                e => e.Id == originalEvent.Id,
                TestContext.Current.CancellationToken
            );
        historicalEvent.Should().NotBeNull();
        historicalEvent!.DeviceName.Should().Be("Lâmpada Original");
        historicalEvent.RoomName.Should().Be("Sala de Estar");
        historicalEvent.RoomId.Should().Be(room1.Id);
    }
}
