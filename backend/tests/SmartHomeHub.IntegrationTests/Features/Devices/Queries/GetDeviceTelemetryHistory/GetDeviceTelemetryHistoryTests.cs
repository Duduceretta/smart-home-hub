using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using SmartHomeHub.Application.Features.Devices.Queries.GetDeviceTelemetryHistory;
using SmartHomeHub.Domain.Entities;
using SmartHomeHub.Domain.Enums;
using SmartHomeHub.IntegrationTests.Setup;

namespace SmartHomeHub.IntegrationTests.Features.Devices.Queries.GetDeviceTelemetryHistory;

public class GetDeviceTelemetryHistoryTests(IntegrationTestWebAppFactory factory)
    : BaseIntegrationTest(factory)
{
    private async Task<(User user, Device device)> SeedUserAndDeviceAsync()
    {
        var userId = Guid.NewGuid();
        var user = new User
        {
            Id = userId,
            Name = "Eduardo",
            // Precisa bater com o claim "user_id" fixo do TestAuthHandler.
            ExternalAuthUid = "firebase-token-123",
        };

        var device = new Device
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Name = "Tomada Inteligente",
            Brand = "Sonoff",
            ExternalId = $"MAC-HIST-{Guid.NewGuid():N}",
            Type = DeviceType.Switch,
        };

        DbContext.Users.Add(user);
        DbContext.Devices.Add(device);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        return (user, device);
    }

    private DeviceTelemetryLog BuildLog(
        Guid deviceId,
        DateTimeOffset timestamp,
        double power,
        double temperature,
        int? voltage = null,
        double? humidity = null,
        bool isOn = true
    ) =>
        new()
        {
            DeviceId = deviceId,
            Timestamp = timestamp,
            IsOn = isOn,
            Voltage = voltage,
            PowerUsageWatts = power,
            TemperatureCelsius = temperature,
            HumidityPercent = humidity,
        };

    [Fact]
    public async Task GetHistory_WithShortRange24h_ShouldReadRawTable_WithoutAggregation()
    {
        var (_, device) = await SeedUserAndDeviceAsync();
        var now = DateTimeOffset.UtcNow;

        var insideRange1 = BuildLog(device.Id, now.AddHours(-1), 100, 20);
        var insideRange2 = BuildLog(device.Id, now.AddHours(-2), 120, 21);
        var outsideRange = BuildLog(device.Id, now.AddHours(-30), 999, 99);

        DbContext.DeviceTelemetryLogs.AddRange(insideRange1, insideRange2, outsideRange);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        var response = await Client.GetAsync(
            $"/api/devices/{device.Id}/telemetry?range=24h",
            TestContext.Current.CancellationToken
        );

        var dto = await response.Content.ReadFromJsonAsync<DeviceTelemetryHistoryDto>(
            TestContext.Current.CancellationToken
        );

        dto.Should().NotBeNull();
        dto!
            .Points.Should()
            .HaveCount(
                2,
                "range curto deve ler a tabela bruta ponto a ponto, sem agregação por dia"
            );

        // Mesma contagem/valores que uma consulta manual direto na tabela bruta pro mesmo período.
        dto.Points.Select(p => p.PowerUsageWatts).Should().BeEquivalentTo([100d, 120d]);
    }

    [Fact]
    public async Task GetHistory_WithLongRange7d_ShouldReadContinuousAggregate_AndAppendLatestRawPoint()
    {
        var (_, device) = await SeedUserAndDeviceAsync();
        var todayUtc = DateTimeOffset.UtcNow.Date;

        // Dia -5: dois logs no mesmo bucket diário -> média/máximo esperados manualmente.
        var day5Log1 = BuildLog(device.Id, todayUtc.AddDays(-5).AddHours(8), 100, 20);
        var day5Log2 = BuildLog(device.Id, todayUtc.AddDays(-5).AddHours(14), 200, 22);

        // Dia -3: um único log.
        var day3Log = BuildLog(device.Id, todayUtc.AddDays(-3).AddHours(10), 300, 25);

        // Fora da janela de 7 dias — não deve aparecer.
        var outOfRangeLog = BuildLog(device.Id, todayUtc.AddDays(-40), 9999, 99);

        // Leitura "agora" (hoje): não deve virar bucket agregado (dia corrente é
        // excluído da aggregate), deve aparecer como o último ponto, com os
        // campos que a aggregate não tem (Voltage/HumidityPercent/IsOn) preenchidos.
        var latestRaw = BuildLog(
            device.Id,
            DateTimeOffset.UtcNow,
            999,
            30,
            voltage: 230,
            humidity: 55,
            isOn: true
        );

        DbContext.DeviceTelemetryLogs.AddRange(
            day5Log1,
            day5Log2,
            day3Log,
            outOfRangeLog,
            latestRaw
        );
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        await DbContext.Database.ExecuteSqlRawAsync(
            "CALL refresh_continuous_aggregate('device_telemetry_daily', NULL, NULL);",
            TestContext.Current.CancellationToken
        );

        var response = await Client.GetAsync(
            $"/api/devices/{device.Id}/telemetry?range=7d",
            TestContext.Current.CancellationToken
        );

        var dto = await response.Content.ReadFromJsonAsync<DeviceTelemetryHistoryDto>(
            TestContext.Current.CancellationToken
        );

        dto.Should().NotBeNull();
        dto!
            .Points.Should()
            .HaveCount(
                3,
                "2 buckets diários agregados (dia -5 e dia -3) + 1 leitura bruta mais recente anexada. "
                    + "O log de -40 dias fica fora da janela de 7 dias."
            );

        // Cálculo manual sobre a tabela bruta, pra garantir que a aggregate não está
        // desatualizada/incorreta: bucket do dia -5 deve ser a média/máximo exatos
        // dos dois logs brutos daquele dia.
        var manualDay5AvgPower = new[]
        {
            day5Log1.PowerUsageWatts,
            day5Log2.PowerUsageWatts,
        }.Average(v => v!.Value);
        var manualDay5AvgTemp = new[]
        {
            day5Log1.TemperatureCelsius,
            day5Log2.TemperatureCelsius,
        }.Average(v => v!.Value);

        var day5Bucket = dto.Points[0];
        day5Bucket.PowerUsageWatts.Should().Be(manualDay5AvgPower);
        day5Bucket.TemperatureCelsius.Should().Be(manualDay5AvgTemp);
        // Campos que a aggregate não tem devem vir nulos/neutros nos buckets agregados.
        day5Bucket.Voltage.Should().BeNull();
        day5Bucket.HumidityPercent.Should().BeNull();

        var day3Bucket = dto.Points[1];
        day3Bucket.PowerUsageWatts.Should().Be(day3Log.PowerUsageWatts);
        day3Bucket.TemperatureCelsius.Should().Be(day3Log.TemperatureCelsius);

        // Último ponto: leitura bruta real de "agora", não um bucket agregado —
        // é o que os cards de status (Consumo/Temperatura/Tensão) da UI leem.
        var latestPoint = dto.Points[^1];
        latestPoint.PowerUsageWatts.Should().Be(999);
        latestPoint.TemperatureCelsius.Should().Be(30);
        latestPoint.Voltage.Should().Be(230);
        latestPoint.HumidityPercent.Should().Be(55);
        latestPoint.IsOn.Should().BeTrue();
    }

    [Fact]
    public async Task GetHistory_WithLongRange30d_ShouldIncludeOlderBuckets_ExcludedFrom7dRange()
    {
        var (_, device) = await SeedUserAndDeviceAsync();
        var todayUtc = DateTimeOffset.UtcNow.Date;

        var day20Log = BuildLog(device.Id, todayUtc.AddDays(-20).AddHours(9), 400, 18);
        var latestRaw = BuildLog(
            device.Id,
            DateTimeOffset.UtcNow,
            50,
            15,
            voltage: 220,
            humidity: 40,
            isOn: false
        );

        DbContext.DeviceTelemetryLogs.AddRange(day20Log, latestRaw);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        // A continuous aggregate só reflete inserts novos depois de um refresh —
        // em produção isso roda via add_continuous_aggregate_policy (diário);
        // aqui simula esse ciclo já ter passado.
        await DbContext.Database.ExecuteSqlRawAsync(
            "CALL refresh_continuous_aggregate('device_telemetry_daily', NULL, NULL);",
            TestContext.Current.CancellationToken
        );

        var response = await Client.GetAsync(
            $"/api/devices/{device.Id}/telemetry?range=30d",
            TestContext.Current.CancellationToken
        );

        var dto = await response.Content.ReadFromJsonAsync<DeviceTelemetryHistoryDto>(
            TestContext.Current.CancellationToken
        );

        dto.Should().NotBeNull();
        dto!
            .Points.Should()
            .HaveCount(2, "bucket do dia -20 (dentro dos 30 dias) + leitura bruta mais recente");

        dto.Points[0].PowerUsageWatts.Should().Be(day20Log.PowerUsageWatts);
        dto.Points[^1].Voltage.Should().Be(220);
    }
}
