using SmartHomeHub.Domain.Enums;

namespace SmartHomeHub.Domain.Entities;

public class Device
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid UserId { get; set; }
    public Guid? RoomId { get; set; }

    public string Name { get; set; } = string.Empty;
    public string Brand { get; set; } = string.Empty;

    // O ID físico da placa (ex: MAC Address) usado no MQTT
    public string ExternalId { get; set; } = string.Empty;

    public DeviceType Type { get; set; }
    public bool IsOn { get; set; } = false;

    public User User { get; set; } = null!;
    public Room? Room { get; set; }

    public ICollection<DeviceGroup> Groups { get; set; } = [];
}
