using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using SmartHomeHub.Domain.Entities;
using SmartHomeHub.Domain.Enums;
using SmartHomeHub.IntegrationTests.Setup;

namespace SmartHomeHub.IntegrationTests.Features.Rooms.Queries.GetRoomAutomations;

public class GetRoomAutomationsTests(IntegrationTestWebAppFactory factory)
    : BaseIntegrationTest(factory)
{
    private record RoomAutomationResponse(Guid Id, string Name, bool IsActive, string TriggerKind);

    [Fact]
    public async Task GetRoomAutomations_WithActionReferencingRoomDevice_ShouldIncludeIt()
    {
        var user = new User
        {
            Id = Guid.NewGuid(),
            Name = "Eduardo Ceretta",
            ExternalAuthUid = "firebase-token-123",
        };

        var room = new Room
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            Name = "Sala de Estar",
        };

        var lamp = new Device
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            RoomId = room.Id,
            Name = "Luz",
            Brand = "Philips",
            ExternalId = "MAC-ROOMAUTO-1",
            Type = DeviceType.Light,
        };

        var automation = new Automation
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            Name = "Desligar tudo à noite",
            IsActive = true,
            RulePayload = $$"""
                {
                    "triggers": [{ "type": "time", "id": "t1", "cronExpression": "0 22 * * *" }],
                    "conditions": null,
                    "actions": [{ "deviceId": "{{lamp.Id}}", "desiredState": false }]
                }
                """,
        };

        DbContext.Users.Add(user);
        DbContext.Rooms.Add(room);
        DbContext.Devices.Add(lamp);
        DbContext.Automations.Add(automation);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        var response = await Client.GetAsync(
            $"/api/rooms/{room.Id}/automations",
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var automations = await response.Content.ReadFromJsonAsync<List<RoomAutomationResponse>>(
            cancellationToken: TestContext.Current.CancellationToken
        );

        automations.Should().NotBeNull();
        automations!.Should().ContainSingle();
        automations[0].Name.Should().Be("Desligar tudo à noite");
        automations[0].TriggerKind.Should().Be("schedule");
    }

    [Fact]
    public async Task GetRoomAutomations_WithDeviceStateTriggerOnRoomDevice_ShouldReturnTriggerKindSensor()
    {
        var user = new User
        {
            Id = Guid.NewGuid(),
            Name = "Eduardo Ceretta",
            ExternalAuthUid = "firebase-token-123",
        };

        var room = new Room
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            Name = "Cozinha",
        };

        var sensor = new Device
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            RoomId = room.Id,
            Name = "Sensor de Fumaça",
            Brand = "Xiaomi",
            ExternalId = "MAC-ROOMAUTO-2",
            Type = DeviceType.Sensor,
        };

        var automation = new Automation
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            Name = "Alerta de Fumaça",
            IsActive = true,
            RulePayload = $$"""
                {
                    "triggers": [{ "type": "device_state", "id": "t1", "deviceId": "{{sensor.Id}}", "stateType": "isOn" }],
                    "conditions": null,
                    "actions": []
                }
                """,
        };

        DbContext.Users.Add(user);
        DbContext.Rooms.Add(room);
        DbContext.Devices.Add(sensor);
        DbContext.Automations.Add(automation);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        var response = await Client.GetAsync(
            $"/api/rooms/{room.Id}/automations",
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var automations = await response.Content.ReadFromJsonAsync<List<RoomAutomationResponse>>(
            cancellationToken: TestContext.Current.CancellationToken
        );

        automations.Should().NotBeNull();
        automations!.Should().ContainSingle();
        automations[0].TriggerKind.Should().Be("sensor");
    }

    [Fact]
    public async Task GetRoomAutomations_ReferencingOnlyDevicesFromAnotherRoom_ShouldNotIncludeIt()
    {
        var user = new User
        {
            Id = Guid.NewGuid(),
            Name = "Eduardo Ceretta",
            ExternalAuthUid = "firebase-token-123",
        };

        var targetRoom = new Room
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            Name = "Sala de Estar",
        };
        var otherRoom = new Room
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            Name = "Quarto",
        };

        var deviceInOtherRoom = new Device
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            RoomId = otherRoom.Id,
            Name = "Ar Condicionado",
            Brand = "LG",
            ExternalId = "MAC-ROOMAUTO-3",
            Type = DeviceType.Thermostat,
        };

        var automation = new Automation
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            Name = "Desligar Ar do Quarto",
            IsActive = true,
            RulePayload = $$"""
                {
                    "triggers": [{ "type": "time", "id": "t1", "cronExpression": "0 22 * * *" }],
                    "conditions": null,
                    "actions": [{ "deviceId": "{{deviceInOtherRoom.Id}}", "desiredState": false }]
                }
                """,
        };

        DbContext.Users.Add(user);
        DbContext.Rooms.AddRange(targetRoom, otherRoom);
        DbContext.Devices.Add(deviceInOtherRoom);
        DbContext.Automations.Add(automation);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        var response = await Client.GetAsync(
            $"/api/rooms/{targetRoom.Id}/automations",
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var automations = await response.Content.ReadFromJsonAsync<List<RoomAutomationResponse>>(
            cancellationToken: TestContext.Current.CancellationToken
        );

        automations.Should().NotBeNull();
        automations!.Should().BeEmpty("a automação só referencia dispositivo de outro ambiente.");
    }

    [Fact]
    public async Task GetRoomAutomations_WithNoDevicesInRoom_ShouldReturnEmptyWithoutQueryingAutomations()
    {
        var user = new User
        {
            Id = Guid.NewGuid(),
            Name = "Eduardo Ceretta",
            ExternalAuthUid = "firebase-token-123",
        };

        var emptyRoom = new Room
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            Name = "Depósito",
        };

        DbContext.Users.Add(user);
        DbContext.Rooms.Add(emptyRoom);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        var response = await Client.GetAsync(
            $"/api/rooms/{emptyRoom.Id}/automations",
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var automations = await response.Content.ReadFromJsonAsync<List<RoomAutomationResponse>>(
            cancellationToken: TestContext.Current.CancellationToken
        );

        automations.Should().NotBeNull();
        automations!.Should().BeEmpty();
    }

    [Fact]
    public async Task GetRoomAutomations_OwnedByAnotherUser_ShouldReturnNotFound()
    {
        var loggedUser = new User
        {
            Id = Guid.NewGuid(),
            Name = "Invasor",
            ExternalAuthUid = "firebase-token-123",
        };

        var victim = new User
        {
            Id = Guid.NewGuid(),
            Name = "Vítima",
            ExternalAuthUid = "token-vitima",
        };

        var victimRoom = new Room
        {
            Id = Guid.NewGuid(),
            UserId = victim.Id,
            Name = "Cofre",
        };

        DbContext.Users.AddRange(loggedUser, victim);
        DbContext.Rooms.Add(victimRoom);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        var response = await Client.GetAsync(
            $"/api/rooms/{victimRoom.Id}/automations",
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }
}
