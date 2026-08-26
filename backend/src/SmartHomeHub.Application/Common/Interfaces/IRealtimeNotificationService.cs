using SmartHomeHub.Application.Features.Devices.Common;

namespace SmartHomeHub.Application.Common.Interfaces;

public interface IRealtimeNotificationService
{
    Task NotifyDeviceStatusChangedAsync(
        string firebaseUid,
        Guid deviceId,
        bool isOn,
        bool isOnline,
        CancellationToken cancellationToken = default
    );

    Task NotifyTelemetryReceivedAsync(
        string firebaseUid,
        Guid deviceId,
        double? powerUsageWatts,
        double? temperatureCelsius,
        DateTimeOffset timestamp,
        CancellationToken cancellationToken = default
    );

    Task NotifyDeviceDiscoveredAsync(
        string firebaseUid,
        DiscoveredDeviceDto device,
        CancellationToken cancellationToken = default
    );

    Task NotifyDeviceMediaChangedAsync(
        string firebaseUid,
        Guid deviceId,
        DeviceMediaStateDto state,
        CancellationToken cancellationToken = default
    );

    Task NotifySpotifyPlaybackChangedAsync(
        string firebaseUid,
        DeviceMediaStateDto state,
        CancellationToken cancellationToken = default
    );

    Task NotifyAutomationExecutionResultAsync(
        string firebaseUid,
        Guid automationId,
        Guid deviceId,
        bool success,
        string? errorMessage,
        string traceId,
        CancellationToken cancellationToken = default
    );
}
