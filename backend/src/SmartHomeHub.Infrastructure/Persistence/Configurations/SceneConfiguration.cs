using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SmartHomeHub.Domain.Entities;

namespace SmartHomeHub.Infrastructure.Persistence.Configurations;

public class SceneConfiguration : IEntityTypeConfiguration<Scene>
{
    public void Configure(EntityTypeBuilder<Scene> builder)
    {
        builder.HasKey(scene => scene.Id);

        builder.Property(scene => scene.Name).IsRequired().HasMaxLength(100);
        builder.Property(scene => scene.Icon).HasMaxLength(50);

        builder.Property(scene => scene.CreatedAt).IsRequired();
        builder.Property(scene => scene.UpdatedAt).IsRequired(false);
        builder.Property(scene => scene.LastActivatedAt).IsRequired(false);

        // Restrict por simetria com Room/Device/DeviceGroup/Automation (RestrictUserCascades).
        builder
            .HasOne(scene => scene.User)
            .WithMany()
            .HasForeignKey(scene => scene.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder
            .HasMany(scene => scene.Items)
            .WithOne(item => item.Scene)
            .HasForeignKey(item => item.SceneId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(scene => scene.UserId);

        builder.HasQueryFilter(scene => !scene.IsDeleted);
    }
}
