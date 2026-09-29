using SmartHomeHub.Domain.Common.Interfaces;

namespace SmartHomeHub.Domain.Entities;

public class User : IAuditableEntity, ISoftDeletable
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string ExternalAuthUid { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;

    /// <summary>
    /// Localização da residência, capturada uma única vez (geolocalização do
    /// navegador, com consentimento explícito) e reusada pra sempre — nunca
    /// re-perguntada nem regeolocalizada a cada carregamento (mesmo padrão
    /// de app de casa inteligente real: a casa não se move, só quem abre o
    /// dashboard). Null = localização ainda não configurada.
    /// </summary>
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }

    // Auditoria (IAuditableEntity)
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? UpdatedAt { get; set; }

    // Soft Delete (ISoftDeletable)
    public bool IsDeleted { get; set; }
    public DateTimeOffset? DeletedAt { get; set; }

    // Relacionamentos
    public ICollection<Room> Rooms { get; set; } = [];
    public ICollection<Device> Devices { get; set; } = [];
    public ICollection<DeviceGroup> DeviceGroups { get; set; } = [];
    public SpotifyIntegration? SpotifyIntegration { get; set; }
}
