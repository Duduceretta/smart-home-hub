namespace SmartHomeHub.Domain.Entities;

public class User
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string ExternalAuthUid { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Relacionamento
    public ICollection<Room> Rooms { get; set; } = [];
    public ICollection<Device> Devices { get; set; } = [];
    public ICollection<DeviceGroup> DeviceGroups { get; set; } = [];
}