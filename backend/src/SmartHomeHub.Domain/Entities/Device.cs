using SmartHomeHub.Domain.Common.Interfaces;
using SmartHomeHub.Domain.Enums;
using SmartHomeHub.Domain.ValueObjects;

namespace SmartHomeHub.Domain.Entities;

/// <summary>
/// Representa um dispositivo físico registrado no Hub.
/// Exclusões pela aplicação utilizam soft-delete (<see cref="ISoftDeletable"/>).
/// Tentativas de DELETE físico direto via SQL com telemetria vinculada são
/// bloqueadas pela constraint física do banco (<see cref="DeviceTelemetryLog"/>
/// → Device é <c>DeleteBehavior.Restrict</c>), protegendo permanentemente o
/// dataset histórico preservado para treinamento de ML futuro (ver
/// <c>backend/docs/database-iot.md</c>, seção "Proteção física: hard-delete de
/// Device bloqueado por Restrict").
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

    public IDeviceConfiguration Configuration { get; set; } = new MqttDeviceConfiguration();

    /// <summary>
    /// Único caminho que deveria ser usado pra trocar o protocolo de um
    /// Device já existente — reconstrói <see cref="Configuration"/> do zero
    /// na categoria certa (<see cref="DeviceConfigurationTypeResolver"/>)
    /// como parte atômica da própria troca de <see cref="IntegrationType"/>,
    /// em vez de depender de cada Handler lembrar de reconstruir manualmente.
    /// Os setters de <see cref="IntegrationType"/>/<see cref="Configuration"/>
    /// continuam públicos (EF Core precisa deles pra materializar, e
    /// <c>DeviceConfigurationMaterializationInterceptor</c> os usa a partir
    /// de outro assembly), então esta invariante não é garantida em tempo de
    /// compilação — qualquer divergência que escapar deste método é barrada
    /// em <c>AppDbContext.SaveChangesAsync</c> antes de chegar no banco (ver
    /// <c>backend/docs/architecture.md</c>, seção 1.5).
    /// </summary>
    public void ChangeIntegrationType(IntegrationType newType)
    {
        if (IntegrationType == newType)
            return;

        IntegrationType = newType;
        Configuration = DeviceConfigurationTypeResolver.CreateDefault(newType);
    }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? UpdatedAt { get; set; }

    public bool IsDeleted { get; set; }
    public DateTimeOffset? DeletedAt { get; set; }

    public User User { get; set; } = null!;
    public Room? Room { get; set; }
    public DeviceLiveState? LiveState { get; set; }
    public ICollection<DeviceGroup> Groups { get; set; } = [];
}
