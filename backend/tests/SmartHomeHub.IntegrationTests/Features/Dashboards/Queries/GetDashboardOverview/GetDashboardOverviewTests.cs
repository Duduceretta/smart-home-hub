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
        bool IsEnergyEstimated,
        double AverageTemperatureCelsius,
        double TemperatureTrend,
        int ActiveAlertsCount
    );

    private record EnergyChartPointResponse(
        DateTimeOffset Timestamp,
        double Value,
        bool IsEstimated
    );

    private record RoomEnergyUsageResponse(Guid? RoomId, double Value, bool IsEstimated);

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

        // "Online" é conectividade (IsOnline), não estado de energia (IsOn) —
        // um dispositivo pode estar conectado ao Hub e desligado (ex: luz
        // desligada, mas ainda "vista" pela rede).
        var myOnlineDevice1 = new Device
        {
            Id = Guid.NewGuid(),
            UserId = loggedUser.Id,
            Name = "Luz da Sala",
            Brand = "Philips",
            ExternalId = "MAC-DASH-1",
            Type = DeviceType.Light,
            IsOn = true,
            IsOnline = true,
        };
        var myOnlineDevice2 = new Device
        {
            Id = Guid.NewGuid(),
            UserId = loggedUser.Id,
            Name = "Ar Condicionado",
            Brand = "LG",
            ExternalId = "MAC-DASH-2",
            Type = DeviceType.Thermostat,
            IsOn = false,
            IsOnline = true,
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
            IsOnline = false,
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
            IsOnline = true,
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
    public async Task GetDashboardOverview_ShouldGroupEnergyConsumption_ByFiveMinuteBucket_AndFillGapsBetweenThem()
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

        // Duas leituras dentro do MESMO balde de 5min (08:05-08:10) — devem
        // virar UM ponto no gráfico com a potência MÉDIA, não a soma bruta.
        var logsSameBucket = new List<DeviceTelemetryLog>
        {
            new()
            {
                DeviceId = device.Id,
                Timestamp = targetDate.AddHours(8).AddMinutes(5),
                PowerUsageWatts = 400,
            },
            new()
            {
                DeviceId = device.Id,
                Timestamp = targetDate.AddHours(8).AddMinutes(7),
                PowerUsageWatts = 600,
            },
        };

        // Próximo balde com dado real (08:15) — o balde entre os dois
        // (08:10) não tem nenhuma amostra e deve ser preenchido com 0kW
        // pra manter o eixo do gráfico uniforme.
        var logNextBucket = new DeviceTelemetryLog
        {
            DeviceId = device.Id,
            Timestamp = targetDate.AddHours(8).AddMinutes(15),
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
            Timestamp = targetDate.AddHours(8).AddMinutes(6),
            PowerUsageWatts = null,
        };

        DbContext.Users.Add(loggedUser);
        DbContext.Devices.Add(device);
        DbContext.DeviceTelemetryLogs.AddRange(
            logsSameBucket[0],
            logsSameBucket[1],
            logNextBucket,
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
            .HaveCount(
                3,
                "os baldes 08:05 e 08:15 têm dado real, e 08:10 entra preenchido com 0kW no meio deles."
            );

        var firstBucket = overview.EnergyChart.Single(point =>
            point.Timestamp == targetDate.AddHours(8).AddMinutes(5)
        );
        firstBucket.Value.Should().Be(0.5, "média de 400W e 600W = 500W = 0.5kW.");

        var gapBucket = overview.EnergyChart.Single(point =>
            point.Timestamp == targetDate.AddHours(8).AddMinutes(10)
        );
        gapBucket.Value.Should().Be(0, "balde sem nenhuma amostra, preenchido pelo gap-fill.");

        var lastBucket = overview.EnergyChart.Single(point =>
            point.Timestamp == targetDate.AddHours(8).AddMinutes(15)
        );
        lastBucket.Value.Should().Be(2.0);

        overview
            .Summary.EnergyConsumptionKwh.Should()
            .BeApproximately(
                0.2083,
                0.0001,
                "(0.5 + 0 + 2.0) kW × 5min de cada balde, convertido em kWh."
            );
    }

    [Fact]
    public async Task GetDashboardOverview_ShouldGroupUsage_ByRoomId_ExcludingDevicesWithoutTelemetry()
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

        var now = DateTimeOffset.UtcNow;

        // RoomUsage é derivado de telemetria real (mesma base do gráfico),
        // não de um campo estático no Device — sem nenhum log de potência,
        // um dispositivo simplesmente não contribui pra nenhum grupo, com
        // ou sem cômodo atribuído. roomlessDevice fica de propósito sem
        // telemetria, então nunca aparece (nem como grupo "Sem Ambiente").
        var livingRoomLog1 = new DeviceTelemetryLog
        {
            DeviceId = livingRoomDevice1.Id,
            Timestamp = now,
            PowerUsageWatts = 2000,
        };
        var livingRoomLog2 = new DeviceTelemetryLog
        {
            DeviceId = livingRoomDevice2.Id,
            Timestamp = now,
            PowerUsageWatts = 1000,
        };
        var bedroomLog = new DeviceTelemetryLog
        {
            DeviceId = bedroomDevice.Id,
            Timestamp = now,
            PowerUsageWatts = 1200,
        };

        DbContext.Users.Add(loggedUser);
        DbContext.Rooms.AddRange(livingRoom, bedroom);
        DbContext.Devices.AddRange(
            livingRoomDevice1,
            livingRoomDevice2,
            bedroomDevice,
            roomlessDevice
        );
        DbContext.DeviceTelemetryLogs.AddRange(livingRoomLog1, livingRoomLog2, bedroomLog);
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
            .HaveCount(2, "o dispositivo sem telemetria não deve gerar nenhum grupo.");

        overview
            .RoomUsage.Should()
            .ContainSingle(usage =>
                usage.RoomId == livingRoom.Id && usage.Value == 0.25
            );
        overview
            .RoomUsage.Should()
            .ContainSingle(usage => usage.RoomId == bedroom.Id && usage.Value == 0.1);
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
