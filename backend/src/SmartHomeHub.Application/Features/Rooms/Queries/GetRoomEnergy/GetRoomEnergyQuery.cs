using FluentValidation;
using Mediator;
using Microsoft.EntityFrameworkCore;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Application.Common.Telemetry;
using SmartHomeHub.Domain.Common.Primitives;

namespace SmartHomeHub.Application.Features.Rooms.Queries.GetRoomEnergy;

/// <summary>
/// Value é potência MÉDIA (kW) do balde — mesmo formato do gráfico da
/// Dashboard (EnergyChartPointDto), só que somando apenas os dispositivos
/// deste ambiente.
/// </summary>
public record RoomEnergyChartPointDto(DateTimeOffset Timestamp, double Value, bool IsEstimated);

/// <summary>
/// HasEnergyData=false = nenhum dispositivo do ambiente reportou consumo no
/// período — o front-end omite a seção de gráfico sem ambiguidade.
/// </summary>
public record RoomEnergyResponseDto(
    bool HasEnergyData,
    List<RoomEnergyChartPointDto> Chart,
    double TotalConsumptionKwh,
    bool IsEnergyEstimated
);

public record GetRoomEnergyQuery(Guid RoomId, string FirebaseUid, string? Range = "24h")
    : IQuery<Result<RoomEnergyResponseDto>>;

public class GetRoomEnergyQueryValidator : AbstractValidator<GetRoomEnergyQuery>
{
    private static readonly string[] AllowedRanges = ["24h", "7d"];

    public GetRoomEnergyQueryValidator()
    {
        RuleFor(x => x.RoomId).NotEmpty().WithMessage("O ID do ambiente é obrigatório.");

        RuleFor(x => x.FirebaseUid)
            .NotEmpty()
            .WithMessage("O identificador do usuário é obrigatório.");

        RuleFor(x => x.Range)
            .Must(range => string.IsNullOrEmpty(range) || AllowedRanges.Contains(range.ToLower()))
            .WithMessage("O período deve ser '24h' ou '7d'.");
    }
}

/// <summary>
/// Mesma agregação por balde de 5min do gráfico da Dashboard
/// (TelemetryBucketing, extraído de GetDashboardOverviewQuery), só que
/// filtrando os logs pelos dispositivos deste ambiente antes de agrupar —
/// não existe endpoint de consumo por dispositivo com bucket/alinhamento
/// temporal pronto pra somar no cliente (GetDeviceTelemetryHistoryQuery
/// devolve pontos crus), por isso esta query dedicada.
/// </summary>
public class GetRoomEnergyQueryHandler(IAppDbContext dbContext)
    : IQueryHandler<GetRoomEnergyQuery, Result<RoomEnergyResponseDto>>
{
    public async ValueTask<Result<RoomEnergyResponseDto>> Handle(
        GetRoomEnergyQuery request,
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
            return Result.Failure<RoomEnergyResponseDto>(
                new Error("User.NotFound", "Usuário não encontrado.")
            );

        var room = await dbContext
            .Rooms.AsNoTracking()
            .FirstOrDefaultAsync(
                room => room.Id == request.RoomId && room.UserId == user.Id,
                cancellationToken
            );

        if (room == null)
            return Result.Failure<RoomEnergyResponseDto>(
                new Error("Room.NotFound", "Ambiente não encontrado ou sem permissão de acesso.")
            );

        var roomDeviceIds = await dbContext
            .Devices.AsNoTracking()
            .Where(device =>
                device.RoomId == request.RoomId && device.UserId == user.Id && !device.IsDeleted
            )
            .Select(device => device.Id)
            .ToListAsync(cancellationToken);

        if (roomDeviceIds.Count == 0)
            return Result.Success(new RoomEnergyResponseDto(false, [], 0, false));

        var range = request.Range?.ToLower() ?? "24h";
        var fromDateUtc = range switch
        {
            "7d" => DateTimeOffset.UtcNow.AddDays(-7),
            _ => DateTimeOffset.UtcNow.AddHours(-24),
        };

        var rawEnergyLogs = await dbContext
            .DeviceTelemetryLogs.AsNoTracking()
            .Where(log =>
                roomDeviceIds.Contains(log.DeviceId)
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
            return Result.Success(new RoomEnergyResponseDto(false, [], 0, false));

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
            .Select(group => new RoomEnergyChartPointDto(
                group.Key,
                Math.Round(group.Sum(x => x.AverageWatts) / 1000.0, 4),
                group.Any(x => x.IsEstimated)
            ))
            .OrderBy(point => point.Timestamp)
            .ToList();

        // Mesmo gap-fill do gráfico da Dashboard — preenche baldes sem
        // nenhuma amostra com 0kW pra manter o espaçamento do eixo X
        // uniforme entre os pontos reais.
        if (chartData.Count > 1)
        {
            var filledChartData = new List<RoomEnergyChartPointDto>();
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
                        : new RoomEnergyChartPointDto(bucket, 0, false)
                );
            }

            chartData = filledChartData;
        }

        var totalConsumptionKwh = chartData.Sum(point => point.Value) * bucketDurationHours;

        return Result.Success(
            new RoomEnergyResponseDto(
                true,
                chartData,
                Math.Round(totalConsumptionKwh, 4),
                chartData.Any(point => point.IsEstimated)
            )
        );
    }
}
