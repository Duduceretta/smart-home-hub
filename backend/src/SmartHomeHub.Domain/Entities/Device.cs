using SmartHomeHub.Domain.Common.Interfaces;
using SmartHomeHub.Domain.Enums;
using SmartHomeHub.Domain.ValueObjects;

namespace SmartHomeHub.Domain.Entities;

/// <summary>
/// NUNCA execute DELETE físico direto nesta entidade fora do fluxo de
/// soft-delete da aplicação — isso cascateia (<see cref="DeviceTelemetryLog"/>
/// → Device é <c>DeleteBehavior.Cascade</c> de propósito) e apaga
/// permanentemente todo o histórico de telemetria associado, incluindo dados
/// preservados deliberadamente para treinamento de ML futuro (ver
/// <c>backend/docs/database-iot.md</c>, seção "Invariante: hard-delete de
/// Device apaga telemetria de ML permanentemente").
/// </summary>
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

    // Mesmo padrão de Brightness: só preenchido após SetDeviceColorCommand/
    // SetDeviceColorTempCommand confirmarem sucesso no hardware.
    public string? ColorHex { get; set; }
    public int? ColorTempPercent { get; set; }

    public DeviceConfiguration Configuration { get; set; } = new();

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? UpdatedAt { get; set; }

    public bool IsDeleted { get; set; }
    public DateTimeOffset? DeletedAt { get; set; }

    public User User { get; set; } = null!;
    public Room? Room { get; set; }
    public ICollection<DeviceGroup> Groups { get; set; } = [];
}
