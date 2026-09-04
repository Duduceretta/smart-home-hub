using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SmartHomeHub.Domain.Entities;

namespace SmartHomeHub.Infrastructure.Persistence.Configurations;

public class DeviceLiveStateConfiguration : IEntityTypeConfiguration<DeviceLiveState>
{
    public void Configure(EntityTypeBuilder<DeviceLiveState> builder)
    {
        builder.ToTable("DeviceLiveStates");

        builder.HasKey(s => s.DeviceId);

        builder.Property(s => s.IsOn).IsRequired().HasDefaultValue(false);

        builder.Property(s => s.IsOnline).IsRequired().HasDefaultValue(false);

        builder.Property(s => s.LastSeenAt).IsRequired(false);

        builder.OwnsOne(
            s => s.Attributes,
            attr =>
            {
                attr.ToJson();
            }
        );

        builder
            .HasOne(s => s.Device)
            .WithOne(d => d.LiveState)
            .HasForeignKey<DeviceLiveState>(s => s.DeviceId)
            .IsRequired(false)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
