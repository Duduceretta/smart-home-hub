using Mediator;
using Microsoft.EntityFrameworkCore;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Domain.Common.Primitives;

namespace SmartHomeHub.Application.Features.Dashboards.Queries.GetDashboardOverview;

public record DashboardSummaryDto(
    int TotalDevicesCount,
    int OnlineDevicesCount,
    double EnergyConsumptionKwh,
    double AverageTemperatureCelsius,
    double TemperatureTrend,
    int ActiveAlertsCount
);

public record EnergyChartPointDto(DateTimeOffset Timestamp, double Value);

/// <summary>
/// RoomId nulo representa o bucket "Sem Ambiente" (dispositivos sem cômodo
/// atribuído) — casar por Id em vez de nome evita depender do texto exibido
/// na tela, que é traduzido/pode mudar.
/// </summary>
public record RoomEnergyUsageDto(Guid? RoomId, double Value);

public record RecentEventDto(
    Guid Id,
    DateTimeOffset Timestamp,
    string Title,
    string Description,
    string EventType
);

public record DashboardOverviewResponse(
    DashboardSummaryDto Summary,
    List<EnergyChartPointDto> EnergyChart,
    List<RoomEnergyUsageDto> RoomUsage,
    List<RecentEventDto> RecentActivities
);

public record GetDashboardOverviewQuery(string FirebaseUid, DateTimeOffset TargetDateUtc)
    : IQuery<Result<DashboardOverviewResponse>>;

public sealed class GetDashboardOverviewQueryHandler(IAppDbContext dbContext)
    : IQueryHandler<GetDashboardOverviewQuery, Result<DashboardOverviewResponse>>
{
    public async ValueTask<Result<DashboardOverviewResponse>> Handle(
        GetDashboardOverviewQuery request,
        CancellationToken cancellationToken
    )
    {
        var userDevices = await dbContext
            .Devices.AsNoTracking()
            .Where(device => device.User.ExternalAuthUid == request.FirebaseUid)
            .Select(device => new
            {
                device.Id,
                device.IsOn,
                device.RoomId,
            })
            .ToListAsync(cancellationToken);

        var totalDevicesCount = userDevices.Count;

        if (totalDevicesCount == 0)
        {
            var emptySummary = new DashboardSummaryDto(0, 0, 0, 0, 0, 0);
            return Result.Success(new DashboardOverviewResponse(emptySummary, [], [], []));
        }

        var onlineDevicesCount = userDevices.Count(device => device.IsOn);
        var userDeviceIds = userDevices.Select(d => d.Id).ToList();

        var activeAlertsCount = await dbContext
            .SystemEvents.AsNoTracking()
            .Where(events => events.User.ExternalAuthUid == request.FirebaseUid && events.IsAlert)
            .CountAsync(cancellationToken);

        var startOfDayUtc = request.TargetDateUtc.Date;
        var endOfDayUtc = startOfDayUtc.AddDays(1);

        const int bucketMinutes = 5;

        var rawEnergyLogs = await dbContext
            .DeviceTelemetryLogs.AsNoTracking()
            .Where(log =>
                userDeviceIds.Contains(log.DeviceId)
                && log.Timestamp >= startOfDayUtc
                && log.Timestamp < endOfDayUtc
                && log.PowerUsageWatts.HasValue
            )
            .Select(log => new { log.Timestamp, log.DeviceId, log.PowerUsageWatts })
            .ToListAsync(cancellationToken);

        // Agrupado em memória (não em SQL) em baldes de 5 minutos: dá uma
        // resolução fina o bastante para o gráfico já formar uma curva com
        // poucos minutos de telemetria mockada, sem depender de horas cheias
        // de dados acumulados como o balde por hora exigia.
        var energyChartData = rawEnergyLogs
            .GroupBy(log =>
            {
                var flooredMinute = (log.Timestamp.Minute / bucketMinutes) * bucketMinutes;
                return new DateTimeOffset(
                    log.Timestamp.Year,
                    log.Timestamp.Month,
                    log.Timestamp.Day,
                    log.Timestamp.Hour,
                    flooredMinute,
                    0,
                    TimeSpan.Zero
                );
            })
            .Select(group => new EnergyChartPointDto(
                group.Key,
                Math.Round(group.Sum(x => x.PowerUsageWatts!.Value) / 1000.0, 2)
            ))
            .OrderBy(point => point.Timestamp)
            .ToList();

        var totalConsumptionKwh = energyChartData.Sum(point => point.Value);

        var yesterdayStartUtc = startOfDayUtc.AddDays(-1);

        var todayTemperatures = await dbContext
            .DeviceTelemetryLogs.AsNoTracking()
            .Where(log =>
                userDeviceIds.Contains(log.DeviceId)
                && log.Timestamp >= startOfDayUtc
                && log.Timestamp < endOfDayUtc
                && log.TemperatureCelsius.HasValue
            )
            .Select(log => log.TemperatureCelsius!.Value)
            .ToListAsync(cancellationToken);

        var yesterdayTemperatures = await dbContext
            .DeviceTelemetryLogs.AsNoTracking()
            .Where(log =>
                userDeviceIds.Contains(log.DeviceId)
                && log.Timestamp >= yesterdayStartUtc
                && log.Timestamp < startOfDayUtc
                && log.TemperatureCelsius.HasValue
            )
            .Select(log => log.TemperatureCelsius!.Value)
            .ToListAsync(cancellationToken);

        // Sem leitura hoje = 0 (mesmo padrão de "sem dado" usado nos outros
        // campos do summary). Tendência só faz sentido com baseline de ontem;
        // sem os dois lados, fica 0 em vez de um delta enganoso.
        var averageTemperatureCelsius =
            todayTemperatures.Count > 0 ? Math.Round(todayTemperatures.Average(), 1) : 0;

        var temperatureTrend =
            todayTemperatures.Count > 0 && yesterdayTemperatures.Count > 0
                ? Math.Round(todayTemperatures.Average() - yesterdayTemperatures.Average(), 1)
                : 0;

        // Consumo real por cômodo: soma da telemetria de hoje (mesma base do
        // EnergyConsumptionKwh acima), agrupada pelo cômodo de cada dispositivo
        // (RoomId nulo agrupa os dispositivos sem ambiente) em vez de uma
        // estimativa fixa por contagem de aparelhos.
        var deviceRoomIds = userDevices.ToDictionary(d => d.Id, d => d.RoomId);

        var roomUsageData = rawEnergyLogs
            .GroupBy(log => deviceRoomIds.GetValueOrDefault(log.DeviceId))
            .Select(group => new RoomEnergyUsageDto(
                group.Key,
                Math.Round(group.Sum(x => x.PowerUsageWatts!.Value) / 1000.0, 2)
            ))
            .ToList();

        var recentActivities = await dbContext
            .SystemEvents.AsNoTracking()
            .Where(events => events.User.ExternalAuthUid == request.FirebaseUid)
            .OrderByDescending(events => events.Timestamp)
            .Take(4)
            .Select(e => new RecentEventDto(e.Id, e.Timestamp, e.Title, e.Description, e.EventType))
            .ToListAsync(cancellationToken);

        var summary = new DashboardSummaryDto(
            TotalDevicesCount: totalDevicesCount,
            OnlineDevicesCount: onlineDevicesCount,
            EnergyConsumptionKwh: Math.Round(totalConsumptionKwh, 1),
            AverageTemperatureCelsius: averageTemperatureCelsius,
            TemperatureTrend: temperatureTrend,
            ActiveAlertsCount: activeAlertsCount
        );

        var response = new DashboardOverviewResponse(
            Summary: summary,
            EnergyChart: energyChartData,
            RoomUsage: roomUsageData,
            RecentActivities: recentActivities
        );

        return Result.Success(response);
    }
}
