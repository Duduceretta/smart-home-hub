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

        builder
            .HasOne(log => log.Device)
            .WithMany()
            .HasForeignKey(log => log.DeviceId)
            .OnDelete(DeleteBehavior.Cascade); // Se deletar a lâmpada, apaga todo o histórico dela.
    }
}
