using SmartHomeHub.Domain.Common.Interfaces;

namespace SmartHomeHub.Domain.Entities;

public class DeviceGroup : ISoftDeletable
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Icon { get; set; }

    // Relacionamentos
    public User User { get; set; } = null!;

    //Uma coleção de dispositivos que pertencem a este grupo (N:M)
    public ICollection<Device> Devices { get; set; } = [];

    public bool IsDeleted { get; set; }
    public DateTimeOffset? DeletedAt { get; set; }
}
