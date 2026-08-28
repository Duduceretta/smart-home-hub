using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using SmartHomeHub.Domain.Entities;
using SmartHomeHub.Domain.Enums;
using SmartHomeHub.IntegrationTests.Setup;

namespace SmartHomeHub.IntegrationTests.Features.Rooms.Queries.GetRoomEnergy;

public class GetRoomEnergyTests(IntegrationTestWebAppFactory factory) : BaseIntegrationTest(factory)
{
    private record RoomEnergyChartPointResponse(
        DateTimeOffset Timestamp,
        double Value,
        bool IsEstimated
    );

    private record RoomEnergyResponse(
        bool HasEnergyData,
        List<RoomEnergyChartPointResponse> Chart,
        double TotalConsumptionKwh,
        bool IsEnergyEstimated
    );

    [Fact]
    public async Task GetRoomEnergy_WithNoDevicesReportingPower_ShouldReturnHasEnergyDataFalse()
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
            Name = "Escritório",
        };

        // Dispositivo existe no ambiente, mas nunca reportou telemetria de potência.
        var device = new Device
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            RoomId = room.Id,
            Name = "Fechadura",
            Brand = "Intelbras",
            ExternalId = "MAC-ENERGY-1",
            Type = DeviceType.Lock,
        };

        DbContext.Users.Add(user);
        DbContext.Rooms.Add(room);
        DbContext.Devices.Add(device);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        var response = await Client.GetAsync(
            $"/api/rooms/{room.Id}/energy",
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var energy = await response.Content.ReadFromJsonAsync<RoomEnergyResponse>(
            cancellationToken: TestContext.Current.CancellationToken
        );

        energy.Should().NotBeNull();
        energy!.HasEnergyData.Should().BeFalse();
        energy.Chart.Should().BeEmpty();
        energy.TotalConsumptionKwh.Should().Be(0);
    }

    [Fact]
    public async Task GetRoomEnergy_ShouldSumOnlyDevicesFromThisRoom_GroupedByFiveMinuteBucket()
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

        var targetDeviceA = new Device
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            RoomId = targetRoom.Id,
            Name = "TV",
            Brand = "LG",
            ExternalId = "MAC-ENERGY-2",
            Type = DeviceType.Television,
        };
        var targetDeviceB = new Device
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            RoomId = targetRoom.Id,
            Name = "Luz",
            Brand = "Philips",
            ExternalId = "MAC-ENERGY-3",
            Type = DeviceType.Light,
        };
        var otherRoomDevice = new Device
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            RoomId = otherRoom.Id,
            Name = "Ar Condicionado",
            Brand = "LG",
            ExternalId = "MAC-ENERGY-4",
            Type = DeviceType.Thermostat,
        };

        var bucketStart = TelemetryBucketFixtures.FloorToFiveMinutes(
            DateTimeOffset.UtcNow.AddHours(-1)
        );

        // Dois dispositivos do ambiente-alvo no MESMO balde de 5min — devem
        // virar um único ponto com a potência somada (500W + 300W = 800W).
        var logA = new DeviceTelemetryLog
        {
            DeviceId = targetDeviceA.Id,
            Timestamp = bucketStart.AddMinutes(1),
            PowerUsageWatts = 500,
        };
        var logB = new DeviceTelemetryLog
        {
            DeviceId = targetDeviceB.Id,
            Timestamp = bucketStart.AddMinutes(2),
            PowerUsageWatts = 300,
        };

        // Dispositivo de OUTRO ambiente — não deve entrar na soma.
        var logOtherRoom = new DeviceTelemetryLog
        {
            DeviceId = otherRoomDevice.Id,
            Timestamp = bucketStart.AddMinutes(1),
            PowerUsageWatts = 9999,
        };

        DbContext.Users.Add(user);
        DbContext.Rooms.AddRange(targetRoom, otherRoom);
        DbContext.Devices.AddRange(targetDeviceA, targetDeviceB, otherRoomDevice);
        DbContext.DeviceTelemetryLogs.AddRange(logA, logB, logOtherRoom);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        var response = await Client.GetAsync(
            $"/api/rooms/{targetRoom.Id}/energy",
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var energy = await response.Content.ReadFromJsonAsync<RoomEnergyResponse>(
            cancellationToken: TestContext.Current.CancellationToken
        );

        energy.Should().NotBeNull();
        energy!.HasEnergyData.Should().BeTrue();
        energy.Chart.Should().HaveCount(1, "as duas leituras caem no mesmo balde de 5min.");
        energy
            .Chart[0]
            .Value.Should()
            .Be(0.8, "500W + 300W dos dois dispositivos do ambiente, em kW.");
    }

    [Fact]
    public async Task GetRoomEnergy_WithRange7d_ShouldIncludeReadingsOlderThan24Hours()
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

        var device = new Device
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            RoomId = room.Id,
            Name = "Geladeira",
            Brand = "Brastemp",
            ExternalId = "MAC-ENERGY-5",
            Type = DeviceType.Switch,
        };

        // Fora da janela de 24h, mas dentro da janela de 7 dias.
        var threeDaysAgoLog = new DeviceTelemetryLog
        {
            DeviceId = device.Id,
            Timestamp = DateTimeOffset.UtcNow.AddDays(-3),
            PowerUsageWatts = 150,
        };

        DbContext.Users.Add(user);
        DbContext.Rooms.Add(room);
        DbContext.Devices.Add(device);
        DbContext.DeviceTelemetryLogs.Add(threeDaysAgoLog);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        var response24h = await Client.GetAsync(
            $"/api/rooms/{room.Id}/energy?range=24h",
            TestContext.Current.CancellationToken
        );
        var energy24h = await response24h.Content.ReadFromJsonAsync<RoomEnergyResponse>(
            cancellationToken: TestContext.Current.CancellationToken
        );
        energy24h!
            .HasEnergyData.Should()
            .BeFalse("a leitura de 3 dias atrás está fora da janela de 24h.");

        var response7d = await Client.GetAsync(
            $"/api/rooms/{room.Id}/energy?range=7d",
            TestContext.Current.CancellationToken
        );
        var energy7d = await response7d.Content.ReadFromJsonAsync<RoomEnergyResponse>(
            cancellationToken: TestContext.Current.CancellationToken
        );
        energy7d!
            .HasEnergyData.Should()
            .BeTrue("a leitura de 3 dias atrás está dentro da janela de 7 dias.");
    }

    [Fact]
    public async Task GetRoomEnergy_OwnedByAnotherUser_ShouldReturnNotFound()
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
            $"/api/rooms/{victimRoom.Id}/energy",
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task GetRoomEnergy_WithInvalidRange_ShouldReturnBadRequest()
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
            Name = "Sala",
        };

        DbContext.Users.Add(user);
        DbContext.Rooms.Add(room);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        var response = await Client.GetAsync(
            $"/api/rooms/{room.Id}/energy?range=30d",
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }
}

/// <summary>Helper local só pra alinhar os timestamps de teste no mesmo balde de 5min do handler.</summary>
file static class TelemetryBucketFixtures
{
    public static DateTimeOffset FloorToFiveMinutes(DateTimeOffset timestamp)
    {
        var flooredMinute = (timestamp.Minute / 5) * 5;
        return new DateTimeOffset(
            timestamp.Year,
            timestamp.Month,
            timestamp.Day,
            timestamp.Hour,
            flooredMinute,
            0,
            TimeSpan.Zero
        );
    }
}
