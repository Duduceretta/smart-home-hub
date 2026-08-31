using System.Diagnostics;
using System.Text.Json;
using Mediator;
using Microsoft.EntityFrameworkCore;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Application.Features.Dashboards.ActivityLog;
using SmartHomeHub.Domain.Common.Constants;
using SmartHomeHub.Application.Features.Telemetry.Events;
using SmartHomeHub.Domain.Common.Primitives;
using SmartHomeHub.Domain.Entities;
using SmartHomeHub.Domain.Enums;

namespace SmartHomeHub.Application.Features.Telemetry.Commands.ProcessTelemetry;

public record ProcessTelemetryCommand(string Topic, string Payload) : ICommand<Result>;

public record TelemetryPayload(
    bool IsOn,
    int? Voltage,
    string? SignalStrength,
    double? PowerUsageWatts,
    double? TemperatureCelsius,
    double? HumidityPercent = null,
    string? IpAddress = null
);

public class ProcessTelemetryCommandHandler(
    IAppDbContext dbContext,
    IRealtimeNotificationService notificationService,
    IPublisher publisher
) : ICommandHandler<ProcessTelemetryCommand, Result>
{
    private static readonly JsonSerializerOptions _jsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
    };

    public async ValueTask<Result> Handle(
        ProcessTelemetryCommand request,
        CancellationToken cancellationToken
    )
    {
        try
        {
            var topicParts = request.Topic.Split('/');

            if (topicParts.Length != 3 || topicParts[0] != "home" || topicParts[1] != "telemetry")
            {
                return Result.Failure(
                    new Error("Mqtt.InvalidTopic", "Formato de tópico ignorado.")
                );
            }

            var externalId = topicParts[2];

            var telemetry = JsonSerializer.Deserialize<TelemetryPayload>(
                request.Payload,
                _jsonOptions
            );

            if (telemetry == null)
                return Result.Failure(
                    new Error("Telemetry.Invalid", "Payload vazio ou corrompido.")
                );

            var device = await dbContext
                .Devices.Include(device => device.User)
                .Include(device => device.Room)
                .FirstOrDefaultAsync(device => device.ExternalId == externalId, cancellationToken);

            if (device == null)
            {
                return Result.Failure(
                    new Error("Device.NotFound", "Dispositivo não registrado no Hub.")
                );
            }

            var nowUtc = DateTimeOffset.UtcNow;
            var wasOn = device.IsOn;
            var wasOnline = device.IsOnline;

            device.IsOn = telemetry.IsOn;
            device.IsOnline = true;
            device.LastSeenAt = nowUtc;

            if (!string.IsNullOrWhiteSpace(telemetry.IpAddress))
            {
                device.Configuration.IpAddress = telemetry.IpAddress;
            }

            var telemetryLog = new DeviceTelemetryLog
            {
                DeviceId = device.Id,
                Timestamp = nowUtc,
                IsOn = telemetry.IsOn,
                Voltage = telemetry.Voltage,
                SignalStrength = telemetry.SignalStrength,
                PowerUsageWatts = telemetry.PowerUsageWatts,
                TemperatureCelsius = telemetry.TemperatureCelsius,
                HumidityPercent = telemetry.HumidityPercent,
            };

            dbContext.DeviceTelemetryLogs.Add(telemetryLog);

            var statusChanged = wasOn != device.IsOn || !wasOnline;

            if (statusChanged)
            {
                var (title, description) = ActivityLogMessages.DeviceStatusChanged(
                    device.Name,
                    device.Room?.Name,
                    device.IsOn,
                    device.IsOnline
                );

                dbContext.SystemEvents.Add(
                    new SystemEvent
                    {
                        UserId = device.UserId,
                        DeviceId = device.Id,
                        EventType = SystemEventTypes.StateChange,
                        Title = title,
                        Description = description,
                        Severity = EventSeverity.Info,
                        Source = EventSource.System,
                        DeviceName = device.Name,
                        RoomId = device.RoomId,
                        RoomName = device.Room?.Name,
                        OldValue = !wasOnline ? "offline" : (wasOn ? "on" : "off"),
                        NewValue = device.IsOn ? "on" : "off",
                        IsAlert = false,
                        Timestamp = nowUtc,
                    }
                );
            }

            await dbContext.SaveChangesAsync(cancellationToken);

            var traceId = Activity.Current?.Id ?? Guid.NewGuid().ToString();

            await publisher.Publish(
                new TelemetryProcessedEvent(
                    device.Id,
                    device.User.ExternalAuthUid,
                    device.IsOn,
                    telemetry.PowerUsageWatts,
                    telemetry.TemperatureCelsius,
                    traceId
                ),
                cancellationToken
            );

            if (statusChanged)
            {
                await notificationService.NotifyDeviceStatusChangedAsync(
                    device.User.ExternalAuthUid,
                    device.Id,
                    device.IsOn,
                    device.IsOnline,
                    cancellationToken
                );
            }

            await notificationService.NotifyTelemetryReceivedAsync(
                device.User.ExternalAuthUid,
                device.Id,
                telemetry.PowerUsageWatts,
                telemetry.TemperatureCelsius,
                nowUtc,
                cancellationToken
            );

            return Result.Success();
        }
        catch (JsonException)
        {
            return Result.Failure(
                new Error("Telemetry.ParseError", "Falha ao ler o JSON do dispositivo.")
            );
        }
    }
}
