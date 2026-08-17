using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using SmartHomeHub.Domain.Entities;
using SmartHomeHub.Domain.Enums;
using SmartHomeHub.IntegrationTests.Setup;

namespace SmartHomeHub.IntegrationTests.Features.Dashboards.Queries.GetDashboardOverview;

public class GetDashboardOverviewTests(IntegrationTestWebAppFactory factory)
    : BaseIntegrationTest(factory)
{
    private record SummaryResponse(
        int TotalDevicesCount,
        int OnlineDevicesCount,
        double EnergyConsumptionKwh,
        double AverageTemperatureCelsius,
        double TemperatureTrend,
        int ActiveAlertsCount
    );

    private record EnergyChartPointResponse(DateTimeOffset Timestamp, double Value);

    private record RoomEnergyUsageResponse(string Name, double Value);

    private record RecentEventResponse(
        Guid Id,
        DateTimeOffset Timestamp,
        string Title,
        string Description,
        string EventType
    );

    private record DashboardOverviewResponse(
        SummaryResponse Summary,
        List<EnergyChartPointResponse> EnergyChart,
        List<RoomEnergyUsageResponse> RoomUsage,
        List<RecentEventResponse> RecentActivities
    );

    [Fact]
    public async Task GetDashboardOverview_WithNoDevicesRegistered_ShouldReturnEmptySummaryAndEmptyLists()
    {
        var loggedUser = new User
        {
            Id = Guid.NewGuid(),
            Name = "Eduardo Ceretta",
            Email = "eduardo@smarthome.com",
            ExternalAuthUid = "firebase-token-123",
        };

        DbContext.Users.Add(loggedUser);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        var response = await Client.GetAsync(
            "/api/dashboard/overview",
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var overview = await response.Content.ReadFromJsonAsync<DashboardOverviewResponse>(
            cancellationToken: TestContext.Current.CancellationToken
        );

        overview.Should().NotBeNull();
        overview!.Summary.TotalDevicesCount.Should().Be(0);
        overview.Summary.OnlineDevicesCount.Should().Be(0);
        overview.Summary.EnergyConsumptionKwh.Should().Be(0);
        overview.Summary.ActiveAlertsCount.Should().Be(0);
        overview.EnergyChart.Should().BeEmpty();
        overview.RoomUsage.Should().BeEmpty();
        overview.RecentActivities.Should().BeEmpty();
    }

    [Fact]
    public async Task GetDashboardOverview_ShouldCountDevicesAndAlerts_OnlyFromTheLoggedUser()
    {
        var loggedUser = new User
        {
            Id = Guid.NewGuid(),
            Name = "Eduardo Ceretta",
            Email = "eduardo@smarthome.com",
            ExternalAuthUid = "firebase-token-123",
        };

        var otherUser = new User
        {
            Id = Guid.NewGuid(),
            Name = "Vizinho",
            ExternalAuthUid = "vizinho-token",
        };

        var myOnlineDevice1 = new Device
        {
            Id = Guid.NewGuid(),
            UserId = loggedUser.Id,
            Name = "Luz da Sala",
            Brand = "Philips",
            ExternalId = "MAC-DASH-1",
            Type = DeviceType.Light,
            IsOn = true,
        };
        var myOnlineDevice2 = new Device
        {
            Id = Guid.NewGuid(),
            UserId = loggedUser.Id,
            Name = "Ar Condicionado",
            Brand = "LG",
            ExternalId = "MAC-DASH-2",
            Type = DeviceType.Thermostat,
            IsOn = true,
        };
        var myOfflineDevice = new Device
        {
            Id = Guid.NewGuid(),
            UserId = loggedUser.Id,
            Name = "Fechadura",
            Brand = "Intelbras",
            ExternalId = "MAC-DASH-3",
            Type = DeviceType.Lock,
            IsOn = false,
        };

        var otherUserDevice = new Device
        {
            Id = Guid.NewGuid(),
            UserId = otherUser.Id,
            Name = "TV do Vizinho",
            Brand = "Samsung",
            ExternalId = "MAC-DASH-VIZINHO",
            Type = DeviceType.Television,
            IsOn = true,
        };

        var myAlert1 = new SystemEvent
        {
            Id = Guid.NewGuid(),
            UserId = loggedUser.Id,
            EventType = "Security",
            Title = "Porta arrombada",
            Description = "Sensor detectou abertura forçada.",
            IsAlert = true,
            Timestamp = DateTimeOffset.UtcNow,
        };
        var myAlert2 = new SystemEvent
        {
            Id = Guid.NewGuid(),
            UserId = loggedUser.Id,
            EventType = "Security",
            Title = "Movimento suspeito",
            Description = "Câmera detectou movimento.",
            IsAlert = true,
            Timestamp = DateTimeOffset.UtcNow,
        };
        var myNonAlertEvent = new SystemEvent
        {
            Id = Guid.NewGuid(),
            UserId = loggedUser.Id,
            EventType = "Lighting",
            Title = "Luz ligada",
            Description = "Luz da sala foi ligada.",
            IsAlert = false,
            Timestamp = DateTimeOffset.UtcNow,
        };
        var otherUserAlert = new SystemEvent
        {
            Id = Guid.NewGuid(),
            UserId = otherUser.Id,
            EventType = "Security",
            Title = "Alerta do vizinho",
            Description = "Não deve contar para o usuário logado.",
            IsAlert = true,
            Timestamp = DateTimeOffset.UtcNow,
        };

        DbContext.Users.AddRange(loggedUser, otherUser);
        DbContext.Devices.AddRange(
            myOnlineDevice1,
            myOnlineDevice2,
            myOfflineDevice,
            otherUserDevice
        );
        DbContext.SystemEvents.AddRange(myAlert1, myAlert2, myNonAlertEvent, otherUserAlert);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        var response = await Client.GetAsync(
            "/api/dashboard/overview",
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var overview = await response.Content.ReadFromJsonAsync<DashboardOverviewResponse>(
            cancellationToken: TestContext.Current.CancellationToken
        );

        overview.Should().NotBeNull();
        overview!
            .Summary.TotalDevicesCount.Should()
            .Be(3, "apenas os dispositivos do usuário logado devem ser contados.");
        overview.Summary.OnlineDevicesCount.Should().Be(2);
        overview
            .Summary.ActiveAlertsCount.Should()
            .Be(2, "apenas os alertas do usuário logado (IsAlert=true) devem ser contados.");
    }

    [Fact]
    public async Task GetDashboardOverview_ShouldGroupEnergyConsumption_ByHour_OnlyForTargetDate()
    {
        var loggedUser = new User
        {
            Id = Guid.NewGuid(),
            Name = "Eduardo Ceretta",
            ExternalAuthUid = "firebase-token-123",
        };

        var device = new Device
        {
            Id = Guid.NewGuid(),
            UserId = loggedUser.Id,
            Name = "Sensor de Consumo",
            Brand = "Sonoff",
            ExternalId = "MAC-DASH-ENERGY",
            Type = DeviceType.Switch,
        };

        var targetDate = new DateTimeOffset(2026, 3, 10, 0, 0, 0, TimeSpan.Zero);

        var logsSameHour = new List<DeviceTelemetryLog>
        {
            new()
            {
                DeviceId = device.Id,
                Timestamp = targetDate.AddHours(8).AddMinutes(5),
                PowerUsageWatts = 500,
            },
            new()
            {
                DeviceId = device.Id,
                Timestamp = targetDate.AddHours(8).AddMinutes(40),
                PowerUsageWatts = 500,
            },
        };

        var logDifferentHour = new DeviceTelemetryLog
        {
            DeviceId = device.Id,
            Timestamp = targetDate.AddHours(14),
            PowerUsageWatts = 2000,
        };

        var logOutsideTargetDate = new DeviceTelemetryLog
        {
            DeviceId = device.Id,
            Timestamp = targetDate.AddDays(-1).AddHours(8),
            PowerUsageWatts = 9999,
        };

        var logWithoutPower = new DeviceTelemetryLog
        {
            DeviceId = device.Id,
            Timestamp = targetDate.AddHours(9),
            PowerUsageWatts = null,
        };

        DbContext.Users.Add(loggedUser);
        DbContext.Devices.Add(device);
        DbContext.DeviceTelemetryLogs.AddRange(
            logsSameHour[0],
            logsSameHour[1],
            logDifferentHour,
            logOutsideTargetDate,
            logWithoutPower
        );
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        var response = await Client.GetAsync(
            $"/api/dashboard/overview?targetDate={Uri.EscapeDataString(targetDate.ToString("O"))}",
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var overview = await response.Content.ReadFromJsonAsync<DashboardOverviewResponse>(
            cancellationToken: TestContext.Current.CancellationToken
        );

        overview.Should().NotBeNull();
        overview!
            .EnergyChart.Should()
            .HaveCount(2, "apenas as duas horas do dia alvo com potência registrada.");

        var hourEightPoint = overview.EnergyChart.Single(point =>
            point.Timestamp == targetDate.AddHours(8)
        );
        hourEightPoint.Value.Should().Be(1.0, "500W + 500W = 1000W, convertidos para 1.0 kWh.");

        var hourFourteenPoint = overview.EnergyChart.Single(point =>
            point.Timestamp == targetDate.AddHours(14)
        );
        hourFourteenPoint.Value.Should().Be(2.0);

        overview
            .Summary.EnergyConsumptionKwh.Should()
            .Be(3.0, "soma de todos os pontos do gráfico do dia alvo (1.0 + 2.0).");
    }

    [Fact]
    public async Task GetDashboardOverview_ShouldGroupUsage_ByRoomName_ExcludingDevicesWithoutRoom()
    {
        var loggedUser = new User
        {
            Id = Guid.NewGuid(),
            Name = "Eduardo Ceretta",
            ExternalAuthUid = "firebase-token-123",
        };

        var livingRoom = new Room
        {
            Id = Guid.NewGuid(),
            UserId = loggedUser.Id,
            Name = "Sala de Estar",
        };
        var bedroom = new Room
        {
            Id = Guid.NewGuid(),
            UserId = loggedUser.Id,
            Name = "Quarto",
        };

        var livingRoomDevice1 = new Device
        {
            Id = Guid.NewGuid(),
            UserId = loggedUser.Id,
            RoomId = livingRoom.Id,
            Name = "TV",
            Brand = "LG",
            ExternalId = "MAC-ROOM-1",
            Type = DeviceType.Television,
        };
        var livingRoomDevice2 = new Device
        {
            Id = Guid.NewGuid(),
            UserId = loggedUser.Id,
            RoomId = livingRoom.Id,
            Name = "Luz",
            Brand = "Philips",
            ExternalId = "MAC-ROOM-2",
            Type = DeviceType.Light,
        };
        var bedroomDevice = new Device
        {
            Id = Guid.NewGuid(),
            UserId = loggedUser.Id,
            RoomId = bedroom.Id,
            Name = "Ar Condicionado",
            Brand = "LG",
            ExternalId = "MAC-ROOM-3",
            Type = DeviceType.Thermostat,
        };
        var roomlessDevice = new Device
        {
            Id = Guid.NewGuid(),
            UserId = loggedUser.Id,
            RoomId = null,
            Name = "Roteador",
            Brand = "TP-Link",
            ExternalId = "MAC-ROOM-4",
            Type = DeviceType.Switch,
        };

        DbContext.Users.Add(loggedUser);
        DbContext.Rooms.AddRange(livingRoom, bedroom);
        DbContext.Devices.AddRange(
            livingRoomDevice1,
            livingRoomDevice2,
            bedroomDevice,
            roomlessDevice
        );
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        var response = await Client.GetAsync(
            "/api/dashboard/overview",
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var overview = await response.Content.ReadFromJsonAsync<DashboardOverviewResponse>(
            cancellationToken: TestContext.Current.CancellationToken
        );

        overview.Should().NotBeNull();
        overview!
            .RoomUsage.Should()
            .HaveCount(2, "o dispositivo sem cômodo não deve gerar um grupo próprio.");

        overview
            .RoomUsage.Should()
            .ContainSingle(usage => usage.Name == "Sala de Estar" && usage.Value == 30.0);
        overview
            .RoomUsage.Should()
            .ContainSingle(usage => usage.Name == "Quarto" && usage.Value == 15.0);
    }

    [Fact]
    public async Task GetDashboardOverview_ShouldReturnFourMostRecentActivities_OwnedByLoggedUser()
    {
        var loggedUser = new User
        {
            Id = Guid.NewGuid(),
            Name = "Eduardo Ceretta",
            ExternalAuthUid = "firebase-token-123",
        };

        var otherUser = new User
        {
            Id = Guid.NewGuid(),
            Name = "Vizinho",
            ExternalAuthUid = "vizinho-token",
        };

        // A query só monta as demais seções quando o usuário possui ao menos
        // um dispositivo cadastrado (ver ramo de retorno antecipado do handler).
        var anyDevice = new Device
        {
            Id = Guid.NewGuid(),
            UserId = loggedUser.Id,
            Name = "Sensor Qualquer",
            Brand = "Genérica",
            ExternalId = "MAC-DASH-ACTIVITIES",
            Type = DeviceType.Sensor,
        };

        var now = DateTimeOffset.UtcNow;

        var myEvents = Enumerable
            .Range(0, 6)
            .Select(i => new SystemEvent
            {
                Id = Guid.NewGuid(),
                UserId = loggedUser.Id,
                EventType = "System",
                Title = $"Evento {i}",
                Description = "Evento de teste.",
                Timestamp = now.AddMinutes(-i),
            })
            .ToList();

        var otherUserMostRecentEvent = new SystemEvent
        {
            Id = Guid.NewGuid(),
            UserId = otherUser.Id,
            EventType = "System",
            Title = "Evento do vizinho",
            Description = "Não deve aparecer para o usuário logado.",
            Timestamp = now.AddMinutes(1),
        };

        DbContext.Users.AddRange(loggedUser, otherUser);
        DbContext.Devices.Add(anyDevice);
        DbContext.SystemEvents.AddRange(myEvents);
        DbContext.SystemEvents.Add(otherUserMostRecentEvent);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        var response = await Client.GetAsync(
            "/api/dashboard/overview",
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var overview = await response.Content.ReadFromJsonAsync<DashboardOverviewResponse>(
            cancellationToken: TestContext.Current.CancellationToken
        );

        overview.Should().NotBeNull();
        overview!.RecentActivities.Should().HaveCount(4);

        overview
            .RecentActivities.Select(activity => activity.Title)
            .Should()
            .ContainInOrder("Evento 0", "Evento 1", "Evento 2", "Evento 3");

        overview
            .RecentActivities.Should()
            .NotContain(activity => activity.Title == "Evento do vizinho");
    }
}
