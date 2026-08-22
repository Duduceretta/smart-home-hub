using Microsoft.AspNetCore.SignalR;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Application.Features.Devices.Common;
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

    public async Task NotifyDeviceDiscoveredAsync(
        string firebaseUid,
        DiscoveredDeviceDto device,
        CancellationToken cancellationToken = default
    )
    {
        await hubContext
            .Clients.Group($"user_{firebaseUid}")
            .SendAsync("DeviceDiscovered", device, cancellationToken);
    }

    public async Task NotifyDeviceMediaChangedAsync(
        string firebaseUid,
        Guid deviceId,
        DeviceMediaStateDto state,
        CancellationToken cancellationToken = default
    )
    {
        await hubContext
            .Clients.Group($"user_{firebaseUid}")
            .SendAsync(
                "DeviceMediaChanged",
                new
                {
                    deviceId,
                    state.VolumePercent,
                    state.IsPlaying,
                    state.Title,
                    state.Artist,
                },
                cancellationToken
            );
    }

    public async Task NotifySpotifyPlaybackChangedAsync(
        string firebaseUid,
        DeviceMediaStateDto state,
        CancellationToken cancellationToken = default
    )
    {
        await hubContext
            .Clients.Group($"user_{firebaseUid}")
            .SendAsync(
                "SpotifyPlaybackChanged",
                new
                {
                    state.VolumePercent,
                    state.IsPlaying,
                    state.Title,
                    state.Artist,
                    state.AlbumCoverUrl,
                    state.DeviceName,
                },
                cancellationToken
            );
    }
}
