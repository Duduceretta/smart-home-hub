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
        var userDevices = await dbContext
            .Devices.AsNoTracking()
            .Where(device => device.User.ExternalAuthUid == request.FirebaseUid)
            .Select(device => new
            {
                device.Id,
                device.IsOn,
                RoomName = device.Room!.Name,
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

        var rawEnergyQuery = await dbContext
            .DeviceTelemetryLogs.AsNoTracking()
            .Where(log =>
                userDeviceIds.Contains(log.DeviceId)
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
            .Select(group => new
            {
                group.Key.Year,
                group.Key.Month,
                group.Key.Day,
                group.Key.Hour,
                TotalWatts = group.Sum(x => x.PowerUsageWatts!.Value),
            })
            .ToListAsync(cancellationToken);

        var energyChartData = rawEnergyQuery
            .Select(item => new EnergyChartPointDto(
                new DateTimeOffset(item.Year, item.Month, item.Day, item.Hour, 0, 0, TimeSpan.Zero),
                Math.Round(item.TotalWatts / 1000.0, 2)
            ))
            .OrderBy(point => point.Timestamp)
            .ToList();

        var totalConsumptionKwh = energyChartData.Sum(point => point.Value);

        var roomUsageData = userDevices
            .Where(d => d.RoomName != null)
            .GroupBy(d => d.RoomName!)
            .Select(group => new RoomEnergyUsageDto(group.Key, group.Count() * 15.0))
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
