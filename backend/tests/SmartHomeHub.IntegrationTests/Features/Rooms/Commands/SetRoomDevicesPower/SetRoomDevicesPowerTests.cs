using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using SmartHomeHub.Domain.Entities;
using SmartHomeHub.Domain.Enums;
using SmartHomeHub.IntegrationTests.Setup;

namespace SmartHomeHub.IntegrationTests.Features.Rooms.Commands.SetRoomDevicesPower;

public class SetRoomDevicesPowerTests(IntegrationTestWebAppFactory factory)
    : BaseIntegrationTest(factory)
{
    private record RoomBulkPowerResponse(int SucceededCount, int FailedCount, int TotalCount);

    [Fact]
    public async Task TurnOn_ShouldTurnOnOnlyOnlineActuatorsThatAreOff()
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

        var offlineLight = new Device
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            RoomId = room.Id,
            Name = "Luz Offline",
            Brand = "Philips",
            ExternalId = "MAC-BULK-1",
            Type = DeviceType.Light,
            LiveState = new DeviceLiveState { IsOnline = false, IsOn = false },
        };
        var alreadyOnSwitch = new Device
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            RoomId = room.Id,
            Name = "Tomada Já Ligada",
            Brand = "Sonoff",
            ExternalId = "MAC-BULK-2",
            Type = DeviceType.Switch,
            LiveState = new DeviceLiveState { IsOnline = true, IsOn = true },
        };
        var offLock = new Device
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            RoomId = room.Id,
            Name = "Fechadura",
            Brand = "Intelbras",
            ExternalId = "MAC-BULK-3",
            Type = DeviceType.Lock,
            LiveState = new DeviceLiveState { IsOnline = true, IsOn = false },
        };
        var sensor = new Device
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            RoomId = room.Id,
            Name = "Sensor de Presença",
            Brand = "Xiaomi",
            ExternalId = "MAC-BULK-4",
            Type = DeviceType.Sensor,
            LiveState = new DeviceLiveState { IsOnline = true, IsOn = false },
        };

        DbContext.Users.Add(user);
        DbContext.Rooms.Add(room);
        DbContext.Devices.AddRange(offlineLight, alreadyOnSwitch, offLock, sensor);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        var response = await Client.PostAsync(
            $"/api/rooms/{room.Id}/devices/turn-on",
            null,
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var result = await response.Content.ReadFromJsonAsync<RoomBulkPowerResponse>(
            cancellationToken: TestContext.Current.CancellationToken
        );

        result.Should().NotBeNull();
        result!.TotalCount.Should().Be(1, "só a fechadura é atuador, online e já não ligado.");
        result.SucceededCount.Should().Be(1);
        result.FailedCount.Should().Be(0);

        var devices = await DbContext
            .Devices.AsNoTracking()
            .Include(d => d.LiveState)
            .Where(device => device.RoomId == room.Id)
            .ToDictionaryAsync(
                device => device.Id,
                device => device.LiveState!.IsOn,
                TestContext.Current.CancellationToken
            );

        devices[offLock.Id].Should().BeTrue("elegível: atuador, online, estava desligado.");
        devices[offlineLight.Id]
            .Should()
            .BeFalse("offline não deve ser comandado, mesmo sendo atuador.");
        devices[sensor.Id]
            .Should()
            .BeFalse("sensor não é atuador — nunca entra na leva, mesmo online e 'desligado'.");
    }

    [Fact]
    public async Task TurnOff_ShouldTurnOffAllOnlineActuatorsThatAreOn()
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
            Name = "Quarto",
        };

        // Dois dispositivos elegíveis de propósito — a leva precisa
        // despachar SetDeviceStateCommand sequencialmente (mesmo DbContext
        // por requisição); rodar em paralelo (Task.WhenAll) já quebrou isso
        // com "A second operation was started on this context instance".
        var onLight = new Device
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            RoomId = room.Id,
            Name = "Lâmpada",
            Brand = "Philips",
            ExternalId = "MAC-BULK-5",
            Type = DeviceType.Light,
            LiveState = new DeviceLiveState { IsOnline = true, IsOn = true },
        };
        var onSwitch = new Device
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            RoomId = room.Id,
            Name = "Tomada",
            Brand = "Sonoff",
            ExternalId = "MAC-BULK-7",
            Type = DeviceType.Switch,
            LiveState = new DeviceLiveState { IsOnline = true, IsOn = true },
        };
        var alreadyOffThermostat = new Device
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            RoomId = room.Id,
            Name = "Ar-Condicionado",
            Brand = "LG",
            ExternalId = "MAC-BULK-6",
            Type = DeviceType.Thermostat,
            LiveState = new DeviceLiveState { IsOnline = true, IsOn = false },
        };

        DbContext.Users.Add(user);
        DbContext.Rooms.Add(room);
        DbContext.Devices.AddRange(onLight, onSwitch, alreadyOffThermostat);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        var response = await Client.PostAsync(
            $"/api/rooms/{room.Id}/devices/turn-off",
            null,
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var result = await response.Content.ReadFromJsonAsync<RoomBulkPowerResponse>(
            cancellationToken: TestContext.Current.CancellationToken
        );

        result.Should().NotBeNull();
        result!.TotalCount.Should().Be(2);
        result.SucceededCount.Should().Be(2);
        result.FailedCount.Should().Be(0);

        var devices = await DbContext
            .Devices.AsNoTracking()
            .Include(d => d.LiveState)
            .Where(device => device.RoomId == room.Id)
            .ToDictionaryAsync(
                device => device.Id,
                device => device.LiveState!.IsOn,
                TestContext.Current.CancellationToken
            );

        devices[onLight.Id].Should().BeFalse();
        devices[onSwitch.Id].Should().BeFalse();
        devices[alreadyOffThermostat.Id]
            .Should()
            .BeFalse("já estava desligado, não deve ter sido tocado.");
    }

    [Fact]
    public async Task TurnOn_WhenNothingIsEligible_ShouldReturnZeroedResult()
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

        var alreadyOnLight = new Device
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            RoomId = room.Id,
            Name = "Luz da Cozinha",
            Brand = "Philips",
            ExternalId = "MAC-BULK-7",
            Type = DeviceType.Light,
            LiveState = new DeviceLiveState { IsOnline = true, IsOn = true },
        };

        DbContext.Users.Add(user);
        DbContext.Rooms.Add(room);
        DbContext.Devices.Add(alreadyOnLight);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        var response = await Client.PostAsync(
            $"/api/rooms/{room.Id}/devices/turn-on",
            null,
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var result = await response.Content.ReadFromJsonAsync<RoomBulkPowerResponse>(
            cancellationToken: TestContext.Current.CancellationToken
        );

        result.Should().NotBeNull();
        result!.TotalCount.Should().Be(0);
        result.SucceededCount.Should().Be(0);
        result.FailedCount.Should().Be(0);
    }

    [Fact]
    public async Task TurnOn_OwnedByAnotherUser_ShouldReturnNotFound()
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

        var response = await Client.PostAsync(
            $"/api/rooms/{victimRoom.Id}/devices/turn-on",
            null,
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }
}
