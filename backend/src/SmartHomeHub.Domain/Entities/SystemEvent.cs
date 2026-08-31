using SmartHomeHub.Domain.Enums;

namespace SmartHomeHub.Domain.Entities;

public class SystemEvent
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }

    public Guid? DeviceId { get; set; }
    public Guid? AutomationId { get; set; }
    public Guid? RoomId { get; set; }
    public Guid? DeviceGroupId { get; set; }

    public string EventType { get; set; } = string.Empty;

    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public bool IsAlert { get; set; }

    public EventSeverity Severity { get; set; } = EventSeverity.Info;
    public EventSource Source { get; set; } = EventSource.System;

    /// <summary>
    /// Snapshot desnormalizado do nome do dispositivo no momento do evento — nunca
    /// resolvido via join com Devices, para não alterar o histórico caso o dispositivo
    /// seja renomeado depois.
    /// </summary>
    public string? DeviceName { get; set; }

    /// <summary>
    /// Snapshot desnormalizado do nome do ambiente no momento do evento — nunca
    /// resolvido via join com Rooms, para não alterar o histórico caso o dispositivo
    /// seja movido de cômodo depois.
    /// </summary>
    public string? RoomName { get; set; }

    /// <summary>
    /// Snapshot desnormalizado do nome do grupo de dispositivos no momento do evento — nunca
    /// resolvido via join com DeviceGroups, para não alterar o histórico caso o grupo
    /// seja renomeado ou deletado depois.
    /// </summary>
    public string? DeviceGroupName { get; set; }

    public string? OldValue { get; set; }
    public string? NewValue { get; set; }

    /// <summary>
    /// Correlaciona todas as linhas geradas pelo mesmo disparo de automação — uma
    /// automação com N ações gera N SystemEvents com o mesmo TraceId. Usado pelas
    /// queries agregadas (contagem semanal, KPI de histórico) pra contar disparos
    /// distintos em vez de linhas brutas. Null para eventos que não vêm de
    /// automação (StateChange manual, health check, etc).
    /// </summary>
    public string? TraceId { get; set; }

    public DateTimeOffset Timestamp { get; set; }

    public User User { get; set; } = null!;
    public Device? Device { get; set; }
    public Automation? Automation { get; set; }
    public Room? Room { get; set; }
    public DeviceGroup? DeviceGroup { get; set; }
}
