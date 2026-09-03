using FluentAssertions;
using Mediator;
using Microsoft.Extensions.DependencyInjection;
using NSubstitute;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Application.Features.Devices.Commands.CreateDevice;
using SmartHomeHub.Application.Features.Devices.Common;
using SmartHomeHub.Domain.Entities;
using SmartHomeHub.Domain.Enums;
using SmartHomeHub.IntegrationTests.Setup;

namespace SmartHomeHub.IntegrationTests.Features.Devices.Discovery;

public class DeviceDiscoveryManagerTests(IntegrationTestWebAppFactory factory)
    : BaseIntegrationTest(factory)
{
    private readonly IDeviceDiscoveryManager _manager =
        factory.Services.GetRequiredService<IDeviceDiscoveryManager>();
    private readonly TestDiscoveryScanner _scanner =
        factory.Services.GetRequiredService<TestDiscoveryScanner>();
    private readonly IRealtimeNotificationService _notificationService =
        factory.Services.GetRequiredService<IRealtimeNotificationService>();

    private static DiscoveredDeviceDto BuildDiscovered(string externalId) =>
        new(
            TemporaryId: Guid.NewGuid().ToString(),
            Name: "Dispositivo de Teste",
            Brand: "TestBrand",
            ExternalId: externalId,
            Type: DeviceType.Switch,
            IntegrationType: IntegrationType.MdnsZeroconf,
            IpAddress: "192.168.1.99",
            MacAddress: null,
            SignalStrength: null,
            AdditionalProperties: null
        );

    private void ResetDiscoveryState()
    {
        _scanner.QueuedResults.Clear();
        _notificationService.ClearReceivedCalls();
    }

    [Fact]
    public async Task StartDiscovery_WithExternalIdAlreadyOwnedByUser_ShouldNotNotify()
    {
        ResetDiscoveryState();

        var user = new User { Name = "Dono", ExternalAuthUid = $"uid-{Guid.NewGuid()}" };
        var device = new Device
        {
            UserId = user.Id,
            Name = "Já Cadastrado",
            Brand = "Marca",
            ExternalId = "OWNED-001",
            Type = DeviceType.Switch,
        };
        DbContext.Users.Add(user);
        DbContext.Devices.Add(device);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        _scanner.QueuedResults.Add(BuildDiscovered("OWNED-001"));

        await _manager.StartDiscoveryAsync(user.ExternalAuthUid, 5, CancellationToken.None);
        await Task.Delay(500, TestContext.Current.CancellationToken);
        await _manager.StopDiscoveryAsync(user.ExternalAuthUid);

        await _notificationService
            .DidNotReceive()
            .NotifyDeviceDiscoveredAsync(
                user.ExternalAuthUid,
                Arg.Is<DiscoveredDeviceDto>(d => d!.ExternalId == "OWNED-001"),
                Arg.Any<CancellationToken>()
            );
    }

    [Fact]
    public async Task StartDiscovery_WithNewExternalId_ShouldNotifyOnce()
    {
        ResetDiscoveryState();

        var user = new User { Name = "Novo Usuário", ExternalAuthUid = $"uid-{Guid.NewGuid()}" };
        DbContext.Users.Add(user);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        _scanner.QueuedResults.Add(BuildDiscovered("NEW-001"));

        await _manager.StartDiscoveryAsync(user.ExternalAuthUid, 5, CancellationToken.None);
        await Task.Delay(500, TestContext.Current.CancellationToken);
        await _manager.StopDiscoveryAsync(user.ExternalAuthUid);

        await _notificationService
            .Received(1)
            .NotifyDeviceDiscoveredAsync(
                user.ExternalAuthUid,
                Arg.Is<DiscoveredDeviceDto>(d => d!.ExternalId == "NEW-001"),
                Arg.Any<CancellationToken>()
            );
    }

    [Fact]
    public async Task StartDiscovery_WithUnknownFirebaseUid_ShouldNotNotifyOrThrow()
    {
        ResetDiscoveryState();

        const string unknownUid = "uid-que-nao-existe";
        _scanner.QueuedResults.Add(BuildDiscovered("ANY-001"));

        await _manager.StartDiscoveryAsync(unknownUid, 5, CancellationToken.None);
        await Task.Delay(500, TestContext.Current.CancellationToken);
        await _manager.StopDiscoveryAsync(unknownUid);

        await _notificationService
            .DidNotReceive()
            .NotifyDeviceDiscoveredAsync(
                unknownUid,
                Arg.Any<DiscoveredDeviceDto>(),
                Arg.Any<CancellationToken>()
            );
    }

    [Fact]
    public async Task StartDiscovery_WithDuplicateExternalIdInSameSession_ShouldNotifyOnlyOnce()
    {
        ResetDiscoveryState();

        var user = new User { Name = "Dedup", ExternalAuthUid = $"uid-{Guid.NewGuid()}" };
        DbContext.Users.Add(user);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        _scanner.QueuedResults.Add(BuildDiscovered("DUPLICATE-001"));
        _scanner.QueuedResults.Add(BuildDiscovered("DUPLICATE-001"));

        await _manager.StartDiscoveryAsync(user.ExternalAuthUid, 5, CancellationToken.None);
        await Task.Delay(500, TestContext.Current.CancellationToken);
        await _manager.StopDiscoveryAsync(user.ExternalAuthUid);

        await _notificationService
            .Received(1)
            .NotifyDeviceDiscoveredAsync(
                user.ExternalAuthUid,
                Arg.Is<DiscoveredDeviceDto>(d => d!.ExternalId == "DUPLICATE-001"),
                Arg.Any<CancellationToken>()
            );
    }

    [Fact]
    public async Task DiscoveredDevice_ShouldBeAcceptedByCreateDeviceCommand()
    {
        var user = new User { Name = "Import", ExternalAuthUid = $"uid-{Guid.NewGuid()}" };
        DbContext.Users.Add(user);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        var discovered = BuildDiscovered("COMPAT-001");

        using var scope = Factory.Services.CreateScope();
        var mediator = scope.ServiceProvider.GetRequiredService<IMediator>();

        var command = new CreateDeviceCommand(
            discovered.Name,
            discovered.Brand,
            discovered.ExternalId,
            discovered.Type,
            discovered.IntegrationType,
            null,
            user.ExternalAuthUid,
            discovered.IpAddress,
            discovered.MacAddress,
            null,
            null,
            null
        );

        var result = await mediator.Send(command, TestContext.Current.CancellationToken);

        result
            .IsSuccess.Should()
            .BeTrue(
                "o payload de descoberta deve sempre servir de entrada para o fluxo de criação existente."
            );
    }
}
