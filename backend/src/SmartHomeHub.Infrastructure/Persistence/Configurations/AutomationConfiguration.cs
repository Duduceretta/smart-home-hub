using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SmartHomeHub.Domain.Entities;

namespace SmartHomeHub.Infrastructure.Persistence.Configurations;

public class AutomationConfiguration : IEntityTypeConfiguration<Automation>
{
    public void Configure(EntityTypeBuilder<Automation> builder)
    {
        builder.HasKey(a => a.Id);

        builder.Property(a => a.Name).IsRequired().HasMaxLength(150);
        builder.Property(a => a.IsActive).IsRequired().HasDefaultValue(true);
        builder.Property(a => a.SchemaVersion).IsRequired().HasDefaultValue(1);
        builder
            .Property(a => a.TriggerKind)
            .IsRequired()
            .HasDefaultValue(SmartHomeHub.Domain.Enums.AutomationTriggerKind.Sensor);
        builder.Property(a => a.IsDraft).IsRequired().HasDefaultValue(true);

        // Define a coluna como JSONB nativo do PostgreSQL
        builder.Property(a => a.RulePayload).IsRequired().HasColumnType("jsonb");

        builder.Property(a => a.CreatedAt).IsRequired();
        builder.Property(a => a.UpdatedAt).IsRequired(false);

        // Relacionamento com Usuário (Restrict por simetria com Device/Room/DeviceGroup)
        builder
            .HasOne(a => a.User)
            .WithMany()
            .HasForeignKey(a => a.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        // Oculta registros soft-deleted
        builder.HasQueryFilter(a => !a.IsDeleted);

        // Índice GIN para buscas rápidas dentro do JSONB no PostgreSQL
        builder.HasIndex(a => a.RulePayload).HasMethod("gin");
    }
}
