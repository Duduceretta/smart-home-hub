using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using SmartHomeHub.Application.Features.Devices.Queries.GetDeviceEnergy;
using SmartHomeHub.Domain.Entities;
using SmartHomeHub.Domain.Enums;
using SmartHomeHub.IntegrationTests.Setup;

namespace SmartHomeHub.IntegrationTests.Features.Devices.Queries.GetDeviceEnergy;

public class GetDeviceEnergyTests(IntegrationTestWebAppFactory factory)
    : BaseIntegrationTest(factory)
{
    private record DeviceEnergyResponse(
        bool HasEnergyData,
        List<DeviceEnergyChartPointDto> Chart,
        double TotalConsumptionKwh,
        bool IsEnergyEstimated,
        bool MeasuresPower
    );

    private async Task<(User User, Device Device)> SeedUserAndDeviceAsync(
        DeviceType type = DeviceType.Switch
    )
    {
        var user = new User
        {
            Id = Guid.NewGuid(),
            Name = "Eduardo Ceretta",
            ExternalAuthUid = "firebase-token-123",
        };

        var device = new Device
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            Name = "Tomada Teste",
            Brand = "Sonoff",
            ExternalId = $"MAC-DEV-ENERGY-{Guid.NewGuid():N}",
            Type = type,
        };

        DbContext.Users.Add(user);
        DbContext.Devices.Add(device);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        return (user, device);
    }

    [Fact]
    public async Task GetDeviceEnergy_WhenDeviceNeverReportedPower_MeasuresPowerShouldBeFalse()
    {
        var (_, device) = await SeedUserAndDeviceAsync(DeviceType.Light);

        // Adiciona telemetria sem PowerUsageWatts (ex: lâmpada comum reportando só estado/tensão).
        var log = new DeviceTelemetryLog
        {
            DeviceId = device.Id,
            Timestamp = DateTimeOffset.UtcNow.AddHours(-2),
            IsOn = true,
            Voltage = 220,
            PowerUsageWatts = null,
        };

        DbContext.DeviceTelemetryLogs.Add(log);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        var response = await Client.GetAsync(
            $"/api/devices/{device.Id}/energy?range=24h",
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var result = await response.Content.ReadFromJsonAsync<DeviceEnergyResponse>(
            cancellationToken: TestContext.Current.CancellationToken
        );

        result.Should().NotBeNull();
        result!.MeasuresPower.Should().BeFalse("o dispositivo nunca reportou potência.");
        result.HasEnergyData.Should().BeFalse();
        result.Chart.Should().BeEmpty();
    }

    [Fact]
    public async Task GetDeviceEnergy_WithRange24h_ShouldQueryRawLogsGroupedByFiveMinutes()
    {
        var (_, device) = await SeedUserAndDeviceAsync();

        var bucketStart = new DateTimeOffset(
            DateTimeOffset.UtcNow.Year,
            DateTimeOffset.UtcNow.Month,
            DateTimeOffset.UtcNow.Day,
            DateTimeOffset.UtcNow.Hour,
            (DateTimeOffset.UtcNow.Minute / 5) * 5,
            0,
            TimeSpan.Zero
        ).AddHours(-1);

        var log1 = new DeviceTelemetryLog
        {
            DeviceId = device.Id,
            Timestamp = bucketStart.AddMinutes(1),
            PowerUsageWatts = 100,
            IsOn = true,
        };
        var log2 = new DeviceTelemetryLog
        {
            DeviceId = device.Id,
            Timestamp = bucketStart.AddMinutes(2),
            PowerUsageWatts = 200,
            IsOn = true,
        };

        DbContext.DeviceTelemetryLogs.AddRange(log1, log2);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        var response = await Client.GetAsync(
            $"/api/devices/{device.Id}/energy?range=24h",
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var result = await response.Content.ReadFromJsonAsync<DeviceEnergyResponse>(
            cancellationToken: TestContext.Current.CancellationToken
        );

        result.Should().NotBeNull();
        result!.MeasuresPower.Should().BeTrue();
        result.HasEnergyData.Should().BeTrue();
        result.Chart.Should().HaveCount(1);
        result.Chart[0].Value.Should().Be(0.15, "média entre 100W e 200W = 150W = 0.15 kW.");
    }

    [Fact]
    public async Task GetDeviceEnergy_WithRange7d_ShouldQueryContinuousAggregateWithManualCheck()
    {
        var (_, device) = await SeedUserAndDeviceAsync();
        var todayUtc = DateTimeOffset.UtcNow.Date;

        var day4Log1 = new DeviceTelemetryLog
        {
            DeviceId = device.Id,
            Timestamp = new DateTimeOffset(todayUtc.AddDays(-4).AddHours(8), TimeSpan.Zero),
            PowerUsageWatts = 200,
            IsOn = true,
        };
        var day4Log2 = new DeviceTelemetryLog
        {
            DeviceId = device.Id,
            Timestamp = new DateTimeOffset(todayUtc.AddDays(-4).AddHours(14), TimeSpan.Zero),
            PowerUsageWatts = 400,
            IsOn = true,
        };

        var day2Log = new DeviceTelemetryLog
        {
            DeviceId = device.Id,
            Timestamp = new DateTimeOffset(todayUtc.AddDays(-2).AddHours(10), TimeSpan.Zero),
            PowerUsageWatts = 100,
            IsOn = true,
        };

        DbContext.DeviceTelemetryLogs.AddRange(day4Log1, day4Log2, day2Log);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        // Atualiza a continuous aggregate para materializar os dias passados no teste
        await DbContext.Database.ExecuteSqlRawAsync(
            "CALL refresh_continuous_aggregate('device_telemetry_daily', NULL, NULL);",
            TestContext.Current.CancellationToken
        );

        var response = await Client.GetAsync(
            $"/api/devices/{device.Id}/energy?range=7d",
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var result = await response.Content.ReadFromJsonAsync<DeviceEnergyResponse>(
            cancellationToken: TestContext.Current.CancellationToken
        );

        result.Should().NotBeNull();
        result!.MeasuresPower.Should().BeTrue();
        result.HasEnergyData.Should().BeTrue();
        result.Chart.Should().HaveCount(2, "2 buckets diários agregados (dia -4 e dia -2).");

        // Cálculo manual para conferência:
        // Dia -4: média entre 200W e 400W = 300W = 0.3 kW
        var manualDay4AvgKw = (200.0 + 400.0) / 2.0 / 1000.0;
        result.Chart[0].Value.Should().Be(manualDay4AvgKw);

        // Dia -2: 100W = 0.1 kW
        result.Chart[1].Value.Should().Be(0.1);

        // Total kWh: dia -4 (0.3 kW * 24h = 7.2 kWh) + dia -2 (0.1 kW * 24h = 2.4 kWh) = 9.6 kWh
        var expectedKwh = Math.Round((0.3 * 24.0) + (0.1 * 24.0), 4);
        result.TotalConsumptionKwh.Should().Be(expectedKwh);
    }
}
