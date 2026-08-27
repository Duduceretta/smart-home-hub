using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SmartHomeHub.Domain.Entities;

namespace SmartHomeHub.Infrastructure.Persistence.Configurations;

public class SystemEventConfiguration : IEntityTypeConfiguration<SystemEvent>
{
    public void Configure(EntityTypeBuilder<SystemEvent> builder)
    {
        builder.HasKey(events => events.Id);

        builder.Property(events => events.Title).IsRequired().HasMaxLength(100);
        builder.Property(events => events.Description).HasMaxLength(255);
        builder.Property(events => events.EventType).IsRequired().HasMaxLength(50);
        builder.Property(events => events.Timestamp).IsRequired();

        builder
            .HasOne(events => events.User)
            .WithMany()
            .HasForeignKey(events => events.UserId)
            .OnDelete(DeleteBehavior.Cascade)
            .IsRequired(false);

        builder.Property(events => events.UserId).IsRequired();

        builder
            .HasOne(events => events.Device)
            .WithMany()
            .HasForeignKey(events => events.DeviceId)
            .OnDelete(DeleteBehavior.SetNull);

        builder
            .HasOne(events => events.Automation)
            .WithMany()
            .HasForeignKey(events => events.AutomationId)
            .OnDelete(DeleteBehavior.SetNull);

        builder
            .HasIndex(events => new { events.UserId, events.Timestamp })
            .IsDescending(false, true);
    }
}
