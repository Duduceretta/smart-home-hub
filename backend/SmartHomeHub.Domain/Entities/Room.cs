namespace SmartHomeHub.Domain.Entities;

public class Room
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; } 
    public string Name { get; set; } = string.Empty;
    public string? Icon { get; set; }

    // Relacionamentos
    public User User { get; set; } = null!;
    public ICollection<Device> Devices { get; set; } = [];
}