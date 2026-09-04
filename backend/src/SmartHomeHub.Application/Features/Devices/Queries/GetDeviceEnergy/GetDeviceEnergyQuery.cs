using FluentValidation;
using Mediator;
using Microsoft.EntityFrameworkCore;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Application.Common.Telemetry;
using SmartHomeHub.Domain.Common.Primitives;

namespace SmartHomeHub.Application.Features.Devices.Queries.GetDeviceEnergy;

/// <summary>
/// Value é potência MÉDIA (kW) do balde — mesmo formato do gráfico de
/// Ambientes (RoomEnergyChartPointDto), só que para um único dispositivo.
/// </summary>
public record DeviceEnergyChartPointDto(DateTimeOffset Timestamp, double Value, bool IsEstimated);

/// <summary>
/// HasEnergyData=false = o dispositivo não reportou consumo no período — o
/// front-end omite a seção de gráfico sem ambiguidade. MeasuresPower
/// distingue "sem hardware de medição" (nunca reportou PowerUsageWatts em
/// nenhum período) de "sem dado NESTE período" — mensagens diferentes no
/// front-end (ver DeviceEnergyChart.tsx).
/// </summary>
public record DeviceEnergyResponseDto(
    bool HasEnergyData,
    List<DeviceEnergyChartPointDto> Chart,
    double TotalConsumptionKwh,
    bool IsEnergyEstimated,
    bool MeasuresPower
);

public record GetDeviceEnergyQuery(Guid DeviceId, string FirebaseUid, string? Range = "24h")
    : IQuery<Result<DeviceEnergyResponseDto>>;

public class GetDeviceEnergyQueryValidator : AbstractValidator<GetDeviceEnergyQuery>
{
    private static readonly string[] AllowedRanges = ["24h", "7d"];

    public GetDeviceEnergyQueryValidator()
    {
        RuleFor(x => x.DeviceId).NotEmpty().WithMessage("O ID do dispositivo é obrigatório.");

        RuleFor(x => x.FirebaseUid)
            .NotEmpty()
            .WithMessage("O identificador do usuário é obrigatório.");

        RuleFor(x => x.Range)
            .Must(range => string.IsNullOrEmpty(range) || AllowedRanges.Contains(range.ToLower()))
            .WithMessage("O período deve ser '24h' ou '7d'.");
    }
}

internal record DeviceTelemetryDailyBucket(DateTimeOffset Bucket, double? AvgPowerWatts);

public class GetDeviceEnergyQueryHandler(IAppDbContext dbContext)
    : IQueryHandler<GetDeviceEnergyQuery, Result<DeviceEnergyResponseDto>>
{
    public async ValueTask<Result<DeviceEnergyResponseDto>> Handle(
        GetDeviceEnergyQuery request,
        CancellationToken cancellationToken
    )
    {
        var user = await dbContext
            .Users.AsNoTracking()
            .FirstOrDefaultAsync(
                user => user.ExternalAuthUid == request.FirebaseUid,
                cancellationToken
            );

        if (user == null)
            return Result.Failure<DeviceEnergyResponseDto>(
                new Error("User.NotFound", "Usuário não encontrado.")
            );

        var device = await dbContext
            .Devices.AsNoTracking()
            .FirstOrDefaultAsync(
                device => device.Id == request.DeviceId && device.UserId == user.Id,
                cancellationToken
            );

        if (device == null)
            return Result.Failure<DeviceEnergyResponseDto>(
                new Error(
                    "Device.NotFound",
                    "Dispositivo não encontrado ou sem permissão de acesso."
                )
            );

        // Aproveita o índice PK composto (DeviceId, Timestamp) ordenando por Timestamp DESC
        // com LIMIT 1 — para no primeiro resultado sem escanear todo o histórico da hypertable.
        var measuresPower = await dbContext
            .DeviceTelemetryLogs.AsNoTracking()
            .Where(log => log.DeviceId == request.DeviceId && log.PowerUsageWatts.HasValue)
            .OrderByDescending(log => log.Timestamp)
            .Select(log => true)
            .FirstOrDefaultAsync(cancellationToken);

        var range = request.Range?.ToLower() ?? "24h";
        var fromDateUtc = range switch
        {
            "7d" => DateTimeOffset.UtcNow.AddDays(-7),
            _ => DateTimeOffset.UtcNow.AddHours(-24),
        };

        List<DeviceEnergyChartPointDto> chartData;
        double totalConsumptionKwh;
        bool isEstimated;

        if (range == "24h")
        {
            var rawEnergyLogs = await dbContext
                .DeviceTelemetryLogs.AsNoTracking()
                .Where(log =>
                    log.DeviceId == request.DeviceId
                    && log.Timestamp >= fromDateUtc
                    && log.PowerUsageWatts.HasValue
                )
                .Select(log => new
                {
                    log.Timestamp,
                    log.DeviceId,
                    log.PowerUsageWatts,
                    log.IsEstimated,
                })
                .ToListAsync(cancellationToken);

            if (rawEnergyLogs.Count == 0)
                return Result.Success(
                    new DeviceEnergyResponseDto(false, [], 0, false, measuresPower)
                );

            const int bucketMinutes = TelemetryBucketing.DefaultBucketMinutes;

            var deviceBucketAverages = TelemetryBucketing.BuildDeviceBucketAverages(
                rawEnergyLogs.Select(log =>
                    (log.Timestamp, log.DeviceId, log.PowerUsageWatts, log.IsEstimated)
                ),
                bucketMinutes
            );

            var bucketDurationHours = bucketMinutes / 60.0;

            chartData = deviceBucketAverages
                .GroupBy(x => x.Bucket)
                .Select(group => new DeviceEnergyChartPointDto(
                    group.Key,
                    Math.Round(group.Sum(x => x.AverageWatts) / 1000.0, 4),
                    group.Any(x => x.IsEstimated)
                ))
                .OrderBy(point => point.Timestamp)
                .ToList();

            // Mesmo gap-fill do gráfico de Ambientes — preenche baldes sem
            // nenhuma amostra com 0kW pra manter o espaçamento do eixo X
            // uniforme entre os pontos reais.
            if (chartData.Count > 1)
            {
                var filledChartData = new List<DeviceEnergyChartPointDto>();
                var existingByBucket = chartData.ToDictionary(point => point.Timestamp);
                var lastBucket = chartData[^1].Timestamp;

                for (
                    var bucket = chartData[0].Timestamp;
                    bucket <= lastBucket;
                    bucket = bucket.AddMinutes(bucketMinutes)
                )
                {
                    filledChartData.Add(
                        existingByBucket.TryGetValue(bucket, out var existingPoint)
                            ? existingPoint
                            : new DeviceEnergyChartPointDto(bucket, 0, false)
                    );
                }

                chartData = filledChartData;
            }

            totalConsumptionKwh = chartData.Sum(point => point.Value) * bucketDurationHours;
            isEstimated = chartData.Any(point => point.IsEstimated);
        }
        else
        {
            // Range 7d: Janela longa usa continuous aggregate device_telemetry_daily
            // para dias consolidados, evitando descompressão e escaneamento de linhas brutas.
            var dailyBuckets = await dbContext
                .Database.SqlQuery<DeviceTelemetryDailyBucket>(
                    $"""
                    SELECT bucket AS "Bucket", avg_power_watts AS "AvgPowerWatts"
                    FROM device_telemetry_daily
                    WHERE "DeviceId" = {request.DeviceId}
                        AND bucket >= {fromDateUtc}
                        AND bucket < date_trunc('day', now())
                    ORDER BY bucket
                    """
                )
                .ToListAsync(cancellationToken);

            var startOfTodayUtc = new DateTimeOffset(
                DateTimeOffset.UtcNow.UtcDateTime.Date,
                TimeSpan.Zero
            );

            var todayLogs = await dbContext
                .DeviceTelemetryLogs.AsNoTracking()
                .Where(log =>
                    log.DeviceId == request.DeviceId
                    && log.Timestamp >= startOfTodayUtc
                    && log.PowerUsageWatts.HasValue
                )
                .Select(log => new
                {
                    log.Timestamp,
                    log.PowerUsageWatts,
                    log.IsEstimated,
                })
                .ToListAsync(cancellationToken);

            if (dailyBuckets.Count == 0 && todayLogs.Count == 0)
                return Result.Success(
                    new DeviceEnergyResponseDto(false, [], 0, false, measuresPower)
                );

            chartData = dailyBuckets
                .Select(bucket => new DeviceEnergyChartPointDto(
                    bucket.Bucket,
                    Math.Round((bucket.AvgPowerWatts ?? 0) / 1000.0, 4),
                    false
                ))
                .ToList();

            double aggregatedDaysKwh = dailyBuckets.Sum(b =>
                ((b.AvgPowerWatts ?? 0) / 1000.0) * 24.0
            );
            double todayKwh = 0;
            bool todayEstimated = false;

            if (todayLogs.Count > 0)
            {
                var todayAvgWatts = todayLogs.Average(l => l.PowerUsageWatts!.Value);
                todayEstimated = todayLogs.Any(l => l.IsEstimated);
                var todayKw = Math.Round(todayAvgWatts / 1000.0, 4);
                chartData.Add(
                    new DeviceEnergyChartPointDto(startOfTodayUtc, todayKw, todayEstimated)
                );

                var hoursToday = Math.Max(
                    (DateTimeOffset.UtcNow - startOfTodayUtc).TotalHours,
                    0.1
                );
                todayKwh = (todayAvgWatts / 1000.0) * hoursToday;
            }

            totalConsumptionKwh = aggregatedDaysKwh + todayKwh;
            isEstimated = chartData.Any(point => point.IsEstimated) || todayEstimated;
        }

        return Result.Success(
            new DeviceEnergyResponseDto(
                true,
                chartData,
                Math.Round(totalConsumptionKwh, 4),
                isEstimated,
                measuresPower
            )
        );
    }
}
