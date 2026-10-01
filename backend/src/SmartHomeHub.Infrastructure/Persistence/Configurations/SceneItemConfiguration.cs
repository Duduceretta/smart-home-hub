using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SmartHomeHub.Domain.Entities;

namespace SmartHomeHub.Infrastructure.Persistence.Configurations;

public class SceneItemConfiguration : IEntityTypeConfiguration<SceneItem>
{
    public void Configure(EntityTypeBuilder<SceneItem> builder)
    {
        builder.HasKey(item => item.Id);

        builder.Property(item => item.ColorHex).HasMaxLength(9);

        // Restrict: o Device é soft-deletado pela aplicação (a FK nunca dispara), e o
        // DELETE físico direto continua bloqueado como já é para telemetria. A remoção
        // do item ao apagar o dispositivo é feita explicitamente no handler.
        builder
            .HasOne(item => item.Device)
            .WithMany()
            .HasForeignKey(item => item.DeviceId)
            .OnDelete(DeleteBehavior.Restrict);

        // Um dispositivo aparece uma única vez por cena.
        builder.HasIndex(item => new { item.SceneId, item.DeviceId }).IsUnique();

        // Mesmo filtro da Scene dona e do Device, evitando item órfão visível.
        builder.HasQueryFilter(item => !item.Scene.IsDeleted && !item.Device.IsDeleted);
    }
}
