using SmartHomeHub.Domain.Common.Interfaces;
using SmartHomeHub.Domain.Enums;

namespace SmartHomeHub.Domain.Entities;

public class Automation : IAuditableEntity, ISoftDeletable
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }

    public string Name { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;

    /// <summary>
    /// Payload estruturado em JSON contendo a árvore ECA (Event, Condition, Action).
    /// </summary>
    public string RulePayload { get; set; } = string.Empty;

    /// <summary>
    /// Derivado de RulePayload (primeiro Trigger) no momento da escrita
    /// (Create/UpdateAutomationCommandHandler) e persistido aqui só pra
    /// permitir filtro/contagem em SQL — RulePayload continua sendo a fonte
    /// de verdade, isso é uma projeção somente-leitura dela.
    /// </summary>
    public AutomationTriggerKind TriggerKind { get; set; } = AutomationTriggerKind.Sensor;

    /// <summary>
    /// true quando RulePayload não tem nenhum Trigger ou nenhuma Action —
    /// mesma regra usada no editor visual pra marcar "Incompleta". Mesmo
    /// racional de TriggerKind: derivado na escrita, persistido só pra
    /// filtro/contagem em SQL.
    /// </summary>
    public bool IsDraft { get; set; } = true;

    /// <summary>
    /// Versão do schema do editor visual, garantindo compatibilidade retroativa.
    /// </summary>
    public int SchemaVersion { get; set; } = 1;

    // Auditoria (IAuditableEntity)
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? UpdatedAt { get; set; }

    // Soft Delete (ISoftDeletable)
    public bool IsDeleted { get; set; }
    public DateTimeOffset? DeletedAt { get; set; }

    // Relacionamentos
    public User User { get; set; } = null!;
}
