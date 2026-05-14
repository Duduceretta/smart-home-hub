namespace SmartHomeHub.Domain.Entities;

public class Device
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; } 
    public Guid? RoomId { get; set; }
    
    public string Name { get; set; } = string.Empty;
    public string Brand { get; set; } = string.Empty; 
    public string ExternalId { get; set; } = string.Empty; 
    public bool IsOn { get; set; } = false;

    // Relacionamentos
    public User? User { get; set; }
    public Room? Room { get; set; }
    
    // O dispositivo sabe de quais grupos ele participa
    public ICollection<DeviceGroup> Groups { get; set; } = [];
}