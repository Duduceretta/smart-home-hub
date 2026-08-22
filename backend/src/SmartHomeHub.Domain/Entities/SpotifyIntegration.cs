using SmartHomeHub.Domain.Common.Interfaces;

namespace SmartHomeHub.Domain.Entities;

// Desconectar é remoção física, não soft delete: um token revogado não tem
// valor de auditoria (ao contrário de Device/Room), então não implementa
// ISoftDeletable.
public class SpotifyIntegration : IAuditableEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }

    public string AccessTokenEncrypted { get; set; } = string.Empty;
    public string RefreshTokenEncrypted { get; set; } = string.Empty;
    public DateTimeOffset ExpiresAtUtc { get; set; }
    public string SpotifyDisplayName { get; set; } = string.Empty;

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? UpdatedAt { get; set; }

    public User User { get; set; } = null!;
}
