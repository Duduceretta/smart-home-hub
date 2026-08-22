using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SmartHomeHub.Domain.Entities;

namespace SmartHomeHub.Infrastructure.Persistence.Configurations;

public class SpotifyIntegrationConfiguration : IEntityTypeConfiguration<SpotifyIntegration>
{
    public void Configure(EntityTypeBuilder<SpotifyIntegration> builder)
    {
        builder.HasKey(integration => integration.Id);

        builder.Property(integration => integration.AccessTokenEncrypted).IsRequired();
        builder.Property(integration => integration.RefreshTokenEncrypted).IsRequired();
        builder.Property(integration => integration.SpotifyDisplayName).HasMaxLength(150);

        builder.Property(integration => integration.CreatedAt).IsRequired();
        builder.Property(integration => integration.UpdatedAt).IsRequired(false);

        builder.HasIndex(integration => integration.UserId).IsUnique();

        builder
            .HasOne(integration => integration.User)
            .WithOne(user => user.SpotifyIntegration)
            .HasForeignKey<SpotifyIntegration>(integration => integration.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        // User tem HasQueryFilter (soft delete) e é o lado obrigatório dessa
        // relação 1:1 — sem um filtro espelhado aqui, um usuário soft-deletado
        // deixaria a integração "órfã" visível com User nulo. Mesma regra do
        // filtro de IsDeleted, projetada através da navegação.
        builder.HasQueryFilter(integration => !integration.User.IsDeleted);
    }
}
