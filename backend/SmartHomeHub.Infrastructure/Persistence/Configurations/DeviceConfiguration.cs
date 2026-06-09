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

        builder.HasIndex(device => device.ExternalId).IsUnique();

        builder.Property(device => device.IsOn).IsRequired().HasDefaultValue(false);

        // Se o usuário for deletado, apaga os dispositivos físicos da conta dele.
        builder
            .HasOne(device => device.User)
            .WithMany(user => user.Devices)
            .HasForeignKey(device => device.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        // Se a sala for deletada, o RoomId vira NULL, mas o dispositivo não é apagado.
        builder
            .HasOne(device => device.Room)
            .WithMany(room => room.Devices)
            .HasForeignKey(device => device.RoomId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
