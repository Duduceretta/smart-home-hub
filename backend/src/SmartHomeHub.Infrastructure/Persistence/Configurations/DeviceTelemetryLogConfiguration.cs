using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SmartHomeHub.Domain.Entities;

namespace SmartHomeHub.Infrastructure.Persistence.Configurations;

public class DeviceTelemetryLogConfiguration : IEntityTypeConfiguration<DeviceTelemetryLog>
{
    public void Configure(EntityTypeBuilder<DeviceTelemetryLog> builder)
    {
        builder.HasKey(log => new { log.DeviceId, log.Timestamp });

        builder.Property(log => log.Timestamp).IsRequired();

        builder.Property(log => log.IsOn).IsRequired();

        // Restrict obrigatório: preserva o histórico bruto de telemetria mesmo
        // se houver tentativa de hard-delete direto de Device via SQL (ML dataset).
        builder
            .HasOne(log => log.Device)
            .WithMany()
            .HasForeignKey(log => log.DeviceId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.Property(log => log.DeviceId).IsRequired();

        builder.HasIndex(log => log.Timestamp).IsDescending();
    }
}
