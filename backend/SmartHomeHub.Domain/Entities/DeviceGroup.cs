namespace SmartHomeHub.Domain.Entities;

public class DeviceGroup
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Icon { get; set; }

    // Relacionamentos
    public User? User { get; set; }
    
    //Uma coleção de dispositivos que pertencem a este grupo (N:M)
    public ICollection<Device> Devices { get; set; } = [];
}