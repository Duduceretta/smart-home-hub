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

public record RoomEnergyUsageDto(string Name, double Value);

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
        var userDevicesQuery = dbContext
            .Devices.AsNoTracking()
            .Where(device => device.User.ExternalAuthUid == request.FirebaseUid);

        var totalDevicesCount = await userDevicesQuery.CountAsync(cancellationToken);

        if (totalDevicesCount == 0)
        {
            var emptySummary = new DashboardSummaryDto(0, 0, 0, 0, 0, 0);
            return Result.Success(new DashboardOverviewResponse(emptySummary, [], [], []));
        }

        var onlineDevicesCount = await userDevicesQuery.CountAsync(
            device => device.IsOn,
            cancellationToken
        );

        var activeAlertsCount = await dbContext
            .SystemEvents.AsNoTracking()
            .Where(events => events.User.ExternalAuthUid == request.FirebaseUid && events.IsAlert)
            .CountAsync(cancellationToken);

        var startOfDayUtc = request.TargetDateUtc.Date;
        var endOfDayUtc = startOfDayUtc.AddDays(1);

        var energyChartData = await dbContext
            .DeviceTelemetryLogs.AsNoTracking()
            .Where(log =>
                log.Device.User.ExternalAuthUid == request.FirebaseUid
                && log.Timestamp >= startOfDayUtc
                && log.Timestamp < endOfDayUtc
                && log.PowerUsageWatts.HasValue
            )
            .GroupBy(log => new
            {
                Year = log.Timestamp.Year,
                Month = log.Timestamp.Month,
                Day = log.Timestamp.Day,
                Hour = log.Timestamp.Hour,
            })
            .Select(group => new EnergyChartPointDto(
                new DateTimeOffset(
                    group.Key.Year,
                    group.Key.Month,
                    group.Key.Day,
                    group.Key.Hour,
                    0,
                    0,
                    TimeSpan.Zero
                ),
                Math.Round(group.Sum(x => x.PowerUsageWatts!.Value) / 1000.0, 2)
            ))
            .OrderBy(point => point.Timestamp)
            .ToListAsync(cancellationToken);

        var totalConsumptionKwh = energyChartData.Sum(point => point.Value);

        var roomUsageData = await dbContext
            .Devices.AsNoTracking()
            .Where(device =>
                device.User.ExternalAuthUid == request.FirebaseUid && device.RoomId != null
            )
            .GroupBy(device => device.Room!.Name)
            .Select(group => new RoomEnergyUsageDto(group.Key, group.Count() * 15.0))
            .ToListAsync(cancellationToken);

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
            AverageTemperatureCelsius: 23.0,
            TemperatureTrend: -1.0,
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
