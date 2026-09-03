using SmartHomeHub.Domain.Common.Interfaces;
using SmartHomeHub.Domain.Enums;
using SmartHomeHub.Domain.ValueObjects;

namespace SmartHomeHub.Domain.Entities;

public class Device : IAuditableEntity, ISoftDeletable
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid UserId { get; set; }
    public Guid? RoomId { get; set; }

    public string Name { get; set; } = string.Empty;
    public string Brand { get; set; } = string.Empty;

    // Identificador físico no protocolo (MAC, ID Tuya, ou sufixo MQTT)
    public string ExternalId { get; set; } = string.Empty;

    public DeviceType Type { get; set; }
    public IntegrationType IntegrationType { get; set; } = IntegrationType.NativeMqtt;

    public bool IsOn { get; set; } = false;
    public bool IsOnline { get; set; } = false;
    public DateTimeOffset? LastSeenAt { get; set; }

    // Só preenchido depois do primeiro SetDeviceBrightnessCommand bem-sucedido
    // contra o hardware — null pra dispositivos que nunca tiveram brilho
    // definido (não-luzes, ou luzes ainda não ajustadas via este comando).
    public int? Brightness { get; set; }

    public DeviceConfiguration Configuration { get; set; } = new();

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? UpdatedAt { get; set; }

    public bool IsDeleted { get; set; }
    public DateTimeOffset? DeletedAt { get; set; }

    public User User { get; set; } = null!;
    public Room? Room { get; set; }
    public ICollection<DeviceGroup> Groups { get; set; } = [];
}
