namespace SmartHomeHub.Domain.Entities;

// Registro de deduplicação para comandos físicos disparados pelo Hangfire
// (entrega at-least-once). Não é soft-deletable nem auditável — é um marcador
// de "já processado", puramente Append-Only.
public class IdempotencyRecord
{
    public string Id { get; set; } = string.Empty;
    public DateTimeOffset CreatedAt { get; set; }
}
