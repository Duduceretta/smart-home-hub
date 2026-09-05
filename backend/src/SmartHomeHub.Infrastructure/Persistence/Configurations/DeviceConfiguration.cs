using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SmartHomeHub.Domain.Entities;
using SmartHomeHub.Infrastructure.Persistence.Conversions;

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

        builder.Property(device => device.CreatedAt).IsRequired();

        builder.Property(device => device.UpdatedAt).IsRequired(false);

        // Tipagem por Value Object discriminada por IntegrationType (ver
        // backend/docs/architecture.md, decisão "Configuration tipada por
        // protocolo") — não é mais um Owned Type via ToJson() porque a
        // coluna guarda um de três tipos concretos diferentes
        // (TuyaDeviceConfiguration/MqttDeviceConfiguration/
        // NetworkDeviceConfiguration), e o EF Core não escolhe tipo
        // concreto de Owned/JSON a partir de uma coluna irmã sem
        // discriminador embutido no próprio documento — o que este projeto
        // deliberadamente evita (duplicaria IntegrationType como fonte de
        // verdade). Ver DeviceConfigurationValueConverter,
        // DeviceConfigurationValueComparer e
        // DeviceConfigurationMaterializationInterceptor.
        builder
            .Property(device => device.Configuration)
            .HasConversion(new DeviceConfigurationValueConverter())
            .HasColumnName("Configuration")
            .HasColumnType("jsonb")
            .Metadata.SetValueComparer(new DeviceConfigurationValueComparer());

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
            .HasForeignKey(device => device.RoomId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasQueryFilter(device => !device.IsDeleted);
    }
}
