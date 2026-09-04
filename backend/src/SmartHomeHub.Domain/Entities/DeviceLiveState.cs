using SmartHomeHub.Domain.ValueObjects;

namespace SmartHomeHub.Domain.Entities;

/// <summary>
/// Representa o estado volátil de alta frequência de escrita (Device Shadow / Digital Twin)
/// de um dispositivo físico (1:1 com Device).
/// Separa atributos dinâmicos e de categorias específicas do registro mestre estático,
/// mitigando o bloat de MVCC em PostgreSQL decorrente de atualizações contínuas de telemetria.
/// </summary>
public class DeviceLiveState
{
    public Guid DeviceId { get; set; }

    public bool IsOn { get; set; } = false;
    public bool IsOnline { get; set; } = false;
    public DateTimeOffset? LastSeenAt { get; set; }

    public DeviceLiveStateAttributes Attributes { get; set; } = new();

    public Device Device { get; set; } = null!;
}
