using FluentValidation;
using Mediator;
using Microsoft.EntityFrameworkCore;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Domain.Common.Primitives;

namespace SmartHomeHub.Application.Features.Devices.Queries.GetDeviceTelemetryHistory;

public record DeviceTelemetryPointDto(
    DateTimeOffset Timestamp,
    double? PowerUsageWatts,
    double? TemperatureCelsius,
    double? HumidityPercent,
    int? Voltage,
    bool IsOn
);

public record DeviceTelemetryHistoryDto(
    Guid DeviceId,
    string DeviceName,
    IReadOnlyList<DeviceTelemetryPointDto> Points
);

// Projeção da continuous aggregate device_telemetry_daily (materialized view,
// não mapeada como entidade EF) usada via Database.SqlQuery<T> pros ranges
// 7d/30d — não tem Voltage/HumidityPercent/IsOn por não fazerem parte do bucket.
internal record DeviceTelemetryDailyBucket(
    DateTimeOffset Bucket,
    double? AvgPowerWatts,
    double? AvgTemperature
);

public record GetDeviceTelemetryHistoryQuery(
    Guid DeviceId,
    string FirebaseUid,
    string? Range = "24h"
) : IQuery<Result<DeviceTelemetryHistoryDto>>;

public class GetDeviceTelemetryHistoryQueryValidator
    : AbstractValidator<GetDeviceTelemetryHistoryQuery>
{
    private static readonly string[] AllowedRanges = ["24h", "7d", "30d"];

    public GetDeviceTelemetryHistoryQueryValidator()
    {
        RuleFor(x => x.DeviceId).NotEmpty().WithMessage("O ID do dispositivo é obrigatório.");

        RuleFor(x => x.FirebaseUid)
            .NotEmpty()
            .WithMessage("O identificador do usuário é obrigatório.");

        RuleFor(x => x.Range)
            .Must(range => string.IsNullOrEmpty(range) || AllowedRanges.Contains(range.ToLower()))
            .WithMessage("O período deve ser '24h', '7d' ou '30d'.");
    }
}

public class GetDeviceTelemetryHistoryQueryHandler(IAppDbContext dbContext)
    : IQueryHandler<GetDeviceTelemetryHistoryQuery, Result<DeviceTelemetryHistoryDto>>
{
    public async ValueTask<Result<DeviceTelemetryHistoryDto>> Handle(
        GetDeviceTelemetryHistoryQuery request,
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
            return Result.Failure<DeviceTelemetryHistoryDto>(
                new Error("User.NotFound", "Usuário não encontrado.")
            );

        var device = await dbContext
            .Devices.AsNoTracking()
            .FirstOrDefaultAsync(
                device => device.Id == request.DeviceId && device.UserId == user.Id,
                cancellationToken
            );

        if (device == null)
            return Result.Failure<DeviceTelemetryHistoryDto>(
                new Error(
                    "Device.NotFound",
                    "Dispositivo não encontrado ou sem permissão de acesso."
                )
            );

        var range = request.Range?.ToLower() ?? "24h";
        var fromDateUtc = range switch
        {
            "7d" => DateTimeOffset.UtcNow.AddDays(-7),
            "30d" => DateTimeOffset.UtcNow.AddDays(-30),
            _ => DateTimeOffset.UtcNow.AddHours(-24),
        };

        // Janela curta (24h): flutuação fina exigida, escaneia a tabela bruta.
        // Janelas longas (7d/30d): tendência é o que importa, então usa a
        // continuous aggregate device_telemetry_daily (já mantida e atualizada
        // diariamente pela migration AddTelemetryCompressionPolicy) em vez de
        // escanear semanas/meses de linhas brutas sem paginação.
        List<DeviceTelemetryPointDto> points;

        if (range == "24h")
        {
            points = await dbContext
                .DeviceTelemetryLogs.AsNoTracking()
                .Where(log => log.DeviceId == request.DeviceId && log.Timestamp >= fromDateUtc)
                .OrderBy(log => log.Timestamp)
                .Select(log => new DeviceTelemetryPointDto(
                    log.Timestamp,
                    log.PowerUsageWatts,
                    log.TemperatureCelsius,
                    log.HumidityPercent,
                    log.Voltage,
                    log.IsOn
                ))
                .ToListAsync(cancellationToken);
        }
        else
        {
            // Exclui o bucket do dia corrente (ainda incompleto): a leitura bruta
            // mais recente é anexada abaixo e já cobre "hoje" com precisão total,
            // evitar isso geraria um ponto quase duplicado (mesmo dia, uma vez
            // como média parcial da aggregate, outra vez como leitura exata).
            var dailyBuckets = await dbContext
                .Database.SqlQuery<DeviceTelemetryDailyBucket>(
                    $"""
                    SELECT bucket AS "Bucket", avg_power_watts AS "AvgPowerWatts", avg_temperature AS "AvgTemperature"
                    FROM device_telemetry_daily
                    WHERE "DeviceId" = {request.DeviceId}
                        AND bucket >= {fromDateUtc}
                        AND bucket < date_trunc('day', now())
                    ORDER BY bucket
                    """
                )
                .ToListAsync(cancellationToken);

            points = dailyBuckets
                .Select(bucket => new DeviceTelemetryPointDto(
                    bucket.Bucket,
                    bucket.AvgPowerWatts,
                    bucket.AvgTemperature,
                    null,
                    null,
                    false
                ))
                .ToList();

            // A aggregate não tem Voltage/HumidityPercent/IsOn (não fazem parte
            // do bucket diário). Os cards de status da UI leem sempre o último
            // ponto da lista como "leitura atual" — então anexa a última leitura
            // bruta real por cima da série agregada, independente do range, pra
            // não perder esses valores no 7d/30d.
            var latestRaw = await dbContext
                .DeviceTelemetryLogs.AsNoTracking()
                .Where(log => log.DeviceId == request.DeviceId)
                .OrderByDescending(log => log.Timestamp)
                .Select(log => new DeviceTelemetryPointDto(
                    log.Timestamp,
                    log.PowerUsageWatts,
                    log.TemperatureCelsius,
                    log.HumidityPercent,
                    log.Voltage,
                    log.IsOn
                ))
                .FirstOrDefaultAsync(cancellationToken);

            if (latestRaw is not null)
                points.Add(latestRaw);
        }

        var result = new DeviceTelemetryHistoryDto(device.Id, device.Name, points);

        return Result.Success(result);
    }
}
