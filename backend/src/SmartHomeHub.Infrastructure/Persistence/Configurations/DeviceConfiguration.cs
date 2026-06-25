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

        builder.HasIndex(device => device.ExternalId).IsUnique().HasFilter("\"IsDeleted\" = false");

        builder.Property(device => device.IsOn).IsRequired().HasDefaultValue(false);

        builder
            .HasOne(device => device.User)
            .WithMany(user => user.Devices)
            .HasForeignKey(device => device.UserId);

        builder
            .HasOne(device => device.Room)
            .WithMany(room => room.Devices)
            .HasForeignKey(device => device.RoomId);

        builder.HasQueryFilter(device => !device.IsDeleted);
    }
}
