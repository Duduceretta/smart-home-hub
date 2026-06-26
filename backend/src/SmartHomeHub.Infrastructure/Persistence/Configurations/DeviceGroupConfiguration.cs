using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SmartHomeHub.Domain.Entities;

namespace SmartHomeHub.Infrastructure.Persistence.Configurations;

public class DeviceGroupConfiguration : IEntityTypeConfiguration<DeviceGroup>
{
    public void Configure(EntityTypeBuilder<DeviceGroup> builder)
    {
        builder.HasKey(group => group.Id);

        builder.Property(group => group.Name).IsRequired().HasMaxLength(100);
        builder.Property(group => group.Icon).HasMaxLength(50);

        builder
            .HasOne(group => group.User)
            .WithMany(user => user.DeviceGroups)
            .HasForeignKey(group => group.UserId);

        // Um Grupo tem Muitos Dispositivos <-> Um Dispositivo tem Muitos Grupos
        builder
            .HasMany(group => group.Devices)
            .WithMany(device => device.Groups)
            .UsingEntity(join => join.ToTable("DeviceGroup_Devices"));

        builder.HasQueryFilter(group => !group.IsDeleted);
    }
}
