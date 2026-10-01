using SmartHomeHub.Domain.Common.Interfaces;

namespace SmartHomeHub.Domain.Entities;

/// <summary>
/// Cena: estado-alvo declarativo de um conjunto de dispositivos, ativado sob demanda.
/// Não tem gatilho nem condição (isso é <see cref="Automation"/>) e não guarda estado
/// "ativa" — só o instante da última ativação.
/// </summary>
public class Scene : IAuditableEntity, ISoftDeletable
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }

    public string Name { get; set; } = string.Empty;
    public string? Icon { get; set; }

    public DateTimeOffset? LastActivatedAt { get; set; }

    // Auditoria (IAuditableEntity)
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? UpdatedAt { get; set; }

    // Soft Delete (ISoftDeletable)
    public bool IsDeleted { get; set; }
    public DateTimeOffset? DeletedAt { get; set; }

    // Relacionamentos
    public User User { get; set; } = null!;
    public ICollection<SceneItem> Items { get; set; } = [];
}
