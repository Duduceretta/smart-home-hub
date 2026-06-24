namespace SmartHomeHub.Domain.Entities;

public class DeviceTelemetryLog
{
    public DateTimeOffset Timestamp { get; set; }

    public Guid DeviceId { get; set; }
    public Device? Device { get; set; }

    public bool IsOn { get; set; }
    public int? Voltage { get; set; }
    public string? SignalStrength { get; set; }
}
