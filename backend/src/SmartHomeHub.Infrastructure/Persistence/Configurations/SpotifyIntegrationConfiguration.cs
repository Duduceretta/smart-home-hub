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
    }
}
