using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using SmartHomeHub.Domain.Entities;
using SmartHomeHub.Domain.Enums;
using SmartHomeHub.IntegrationTests.Setup;

namespace SmartHomeHub.IntegrationTests.Features.Rooms.Queries.GetRoomClimate;

public class GetRoomClimateTests(IntegrationTestWebAppFactory factory)
    : BaseIntegrationTest(factory)
{
    private record RoomClimateResponse(
        bool HasClimateSensor,
        double? TemperatureCelsius,
        double? HumidityPercent,
        DateTimeOffset? ReadingTimestampUtc
    );

    [Fact]
    public async Task GetRoomClimate_WithNoSensorOrThermostatInRoom_ShouldReturnHasSensorFalse()
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
            Name = "Garagem",
        };

        // Luz não é sensor/termostato — não deve fazer o endpoint achar clima.
        var lightDevice = new Device
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            RoomId = room.Id,
            Name = "Luz Garagem",
            Brand = "Philips",
            ExternalId = "MAC-CLIMATE-1",
            Type = DeviceType.Light,
        };

        DbContext.Users.Add(user);
        DbContext.Rooms.Add(room);
        DbContext.Devices.Add(lightDevice);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        var response = await Client.GetAsync(
            $"/api/rooms/{room.Id}/climate",
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var climate = await response.Content.ReadFromJsonAsync<RoomClimateResponse>(
            cancellationToken: TestContext.Current.CancellationToken
        );

        climate.Should().NotBeNull();
        climate!.HasClimateSensor.Should().BeFalse();
        climate.TemperatureCelsius.Should().BeNull();
    }

    [Fact]
    public async Task GetRoomClimate_WithThermostatButNoReadingYet_ShouldReturnHasSensorTrueAndNullTemperature()
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

        var thermostat = new Device
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            RoomId = room.Id,
            Name = "Ar Condicionado",
            Brand = "LG",
            ExternalId = "MAC-CLIMATE-2",
            Type = DeviceType.Thermostat,
        };

        DbContext.Users.Add(user);
        DbContext.Rooms.Add(room);
        DbContext.Devices.Add(thermostat);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        var response = await Client.GetAsync(
            $"/api/rooms/{room.Id}/climate",
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var climate = await response.Content.ReadFromJsonAsync<RoomClimateResponse>(
            cancellationToken: TestContext.Current.CancellationToken
        );

        climate.Should().NotBeNull();
        climate!.HasClimateSensor.Should().BeTrue();
        climate.TemperatureCelsius.Should().BeNull();
    }

    [Fact]
    public async Task GetRoomClimate_WithMultipleReadings_ShouldReturnTheMostRecentOne()
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

        var sensor = new Device
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            RoomId = room.Id,
            Name = "Sensor de Temperatura",
            Brand = "Xiaomi",
            ExternalId = "MAC-CLIMATE-3",
            Type = DeviceType.Sensor,
        };

        var now = DateTimeOffset.UtcNow;

        var olderReading = new DeviceTelemetryLog
        {
            DeviceId = sensor.Id,
            Timestamp = now.AddMinutes(-30),
            TemperatureCelsius = 19.5,
            HumidityPercent = 60.0,
        };
        var mostRecentReading = new DeviceTelemetryLog
        {
            DeviceId = sensor.Id,
            Timestamp = now.AddMinutes(-1),
            TemperatureCelsius = 22.3,
            HumidityPercent = 45.0,
        };

        DbContext.Users.Add(user);
        DbContext.Rooms.Add(room);
        DbContext.Devices.Add(sensor);
        DbContext.DeviceTelemetryLogs.AddRange(olderReading, mostRecentReading);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        var response = await Client.GetAsync(
            $"/api/rooms/{room.Id}/climate",
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var climate = await response.Content.ReadFromJsonAsync<RoomClimateResponse>(
            cancellationToken: TestContext.Current.CancellationToken
        );

        climate.Should().NotBeNull();
        climate!.HasClimateSensor.Should().BeTrue();
        climate
            .TemperatureCelsius.Should()
            .Be(22.3, "é a leitura mais recente, não a mais antiga.");
        climate
            .HumidityPercent.Should()
            .Be(45.0, "vem da MESMA linha mais recente da temperatura.");
    }

    [Fact]
    public async Task GetRoomClimate_WithSensorReportingOnlyHumidity_ShouldReturnHumidityWithNullTemperature()
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
            Name = "Banheiro",
        };

        // Alguns sensores reportam só umidade, sem sonda de temperatura.
        var humiditySensor = new Device
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            RoomId = room.Id,
            Name = "Sensor de Umidade",
            Brand = "Xiaomi",
            ExternalId = "MAC-CLIMATE-4",
            Type = DeviceType.Sensor,
        };

        var reading = new DeviceTelemetryLog
        {
            DeviceId = humiditySensor.Id,
            Timestamp = DateTimeOffset.UtcNow,
            TemperatureCelsius = null,
            HumidityPercent = 72.5,
        };

        DbContext.Users.Add(user);
        DbContext.Rooms.Add(room);
        DbContext.Devices.Add(humiditySensor);
        DbContext.DeviceTelemetryLogs.Add(reading);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        var response = await Client.GetAsync(
            $"/api/rooms/{room.Id}/climate",
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var climate = await response.Content.ReadFromJsonAsync<RoomClimateResponse>(
            cancellationToken: TestContext.Current.CancellationToken
        );

        climate.Should().NotBeNull();
        climate!.HasClimateSensor.Should().BeTrue();
        climate.HumidityPercent.Should().Be(72.5);
        climate.TemperatureCelsius.Should().BeNull("este sensor não tem sonda de temperatura.");
    }

    [Fact]
    public async Task GetRoomClimate_OwnedByAnotherUser_ShouldReturnNotFound()
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
            $"/api/rooms/{victimRoom.Id}/climate",
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }
}
