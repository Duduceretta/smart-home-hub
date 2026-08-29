using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SmartHomeHub.Domain.Entities;

namespace SmartHomeHub.Infrastructure.Persistence.Configurations;

public class DeviceConfiguration : IEntityTypeConfiguration<Device>
{
    public void Configure(EntityTypeBuilder<Device> builder)
    {
        builder.HasKey(device => device.Id);

        builder.Property(device => device.Name).IsRequired().HasMaxLength(100);

        builder.Property(device => device.Brand).IsRequired().HasMaxLength(50);

        builder.Property(device => device.ExternalId).IsRequired().HasMaxLength(100);

        builder.Property(device => device.Type).IsRequired();

        builder.Property(device => device.IntegrationType).IsRequired();

        builder.Property(device => device.IsOn).IsRequired().HasDefaultValue(false);

        builder.Property(device => device.IsOnline).IsRequired().HasDefaultValue(false);

        builder.Property(device => device.LastSeenAt).IsRequired(false);

        builder.Property(device => device.CreatedAt).IsRequired();

        builder.Property(device => device.UpdatedAt).IsRequired(false);

        builder.OwnsOne(
            device => device.Configuration,
            config =>
            {
                config.ToJson();
            }
        );

        builder.HasIndex(device => device.ExternalId).IsUnique().HasFilter("\"IsDeleted\" = false");

        // Cascata física proibida (CLAUDE.md) — sem .OnDelete() explícito aqui,
        // a FK obrigatória Device.UserId herdava DeleteBehavior.Cascade por
        // convenção do EF Core (só visível no model snapshot, nunca no código).
        builder
            .HasOne(device => device.User)
            .WithMany(user => user.Devices)
            .HasForeignKey(device => device.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder
            .HasOne(device => device.Room)
            .WithMany(room => room.Devices)
            .HasForeignKey(device => device.RoomId);

        builder.HasQueryFilter(device => !device.IsDeleted);
    }
}
