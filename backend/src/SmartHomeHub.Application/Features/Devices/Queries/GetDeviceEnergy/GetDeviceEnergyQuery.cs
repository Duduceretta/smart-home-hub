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
/// front-end omite a seção de gráfico sem ambiguidade.
/// </summary>
public record DeviceEnergyResponseDto(
    bool HasEnergyData,
    List<DeviceEnergyChartPointDto> Chart,
    double TotalConsumptionKwh,
    bool IsEnergyEstimated
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

/// <summary>
/// Mesma agregação por balde de 5min do gráfico de Ambientes
/// (GetRoomEnergyQuery), sem a etapa de resolver o conjunto de dispositivos
/// do ambiente — filtra a telemetria direto por este DeviceId.
/// </summary>
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

        var range = request.Range?.ToLower() ?? "24h";
        var fromDateUtc = range switch
        {
            "7d" => DateTimeOffset.UtcNow.AddDays(-7),
            _ => DateTimeOffset.UtcNow.AddHours(-24),
        };

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
            return Result.Success(new DeviceEnergyResponseDto(false, [], 0, false));

        const int bucketMinutes = TelemetryBucketing.DefaultBucketMinutes;

        var deviceBucketAverages = TelemetryBucketing.BuildDeviceBucketAverages(
            rawEnergyLogs.Select(log =>
                (log.Timestamp, log.DeviceId, log.PowerUsageWatts, log.IsEstimated)
            ),
            bucketMinutes
        );

        var bucketDurationHours = bucketMinutes / 60.0;

        var chartData = deviceBucketAverages
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

        var totalConsumptionKwh = chartData.Sum(point => point.Value) * bucketDurationHours;

        return Result.Success(
            new DeviceEnergyResponseDto(
                true,
                chartData,
                Math.Round(totalConsumptionKwh, 4),
                chartData.Any(point => point.IsEstimated)
            )
        );
    }
}
