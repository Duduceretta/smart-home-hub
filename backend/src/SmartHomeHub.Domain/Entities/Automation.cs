using SmartHomeHub.Domain.Common.Interfaces;

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
