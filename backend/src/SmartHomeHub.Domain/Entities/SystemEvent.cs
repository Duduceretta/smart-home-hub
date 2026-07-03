namespace SmartHomeHub.Domain.Entities;

public class SystemEvent
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }

    public Guid? DeviceId { get; set; }
    public string EventType { get; set; } = string.Empty;

    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public bool IsAlert { get; set; }

    public DateTimeOffset Timestamp { get; set; }

    public User User { get; set; } = null!;
    public Device? Device { get; set; }
}
