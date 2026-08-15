using Microsoft.AspNetCore.SignalR;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Infrastructure.Realtime.Hubs;

namespace SmartHomeHub.Infrastructure.Realtime.Services;

public class RealtimeNotificationService(IHubContext<TelemetryHub> hubContext)
    : IRealtimeNotificationService
{
    public async Task NotifyDeviceStatusChangedAsync(
        string firebaseUid,
        Guid deviceId,
        bool isOn,
        bool isOnline,
        CancellationToken cancellationToken = default
    )
    {
        await hubContext
            .Clients.Group($"user_{firebaseUid}")
            .SendAsync(
                "DeviceStatusChanged",
                new
                {
                    deviceId,
                    isOn,
                    isOnline,
                },
                cancellationToken
            );
    }

    public async Task NotifyTelemetryReceivedAsync(
        string firebaseUid,
        Guid deviceId,
        double? powerUsageWatts,
        double? temperatureCelsius,
        DateTimeOffset timestamp,
        CancellationToken cancellationToken = default
    )
    {
        await hubContext
            .Clients.Group($"user_{firebaseUid}")
            .SendAsync(
                "ReceiveTelemetryUpdate",
                new
                {
                    deviceId,
                    powerUsageWatts,
                    temperatureCelsius,
                    timestamp,
                },
                cancellationToken
            );
    }
}
