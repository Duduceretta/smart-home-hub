using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SmartHomeHub.Domain.Entities;

namespace SmartHomeHub.Infrastructure.Persistence.Configurations;

public class RoomConfiguration : IEntityTypeConfiguration<Room>
{
    public void Configure(EntityTypeBuilder<Room> builder)
    {
        builder.HasKey(room => room.Id);

        builder.Property(room => room.Name).IsRequired().HasMaxLength(50);

        builder.Property(room => room.Icon).HasMaxLength(50);

        builder.Property(room => room.CreatedAt).IsRequired();

        builder.Property(room => room.UpdatedAt).IsRequired(false);

        // Cascata física proibida (CLAUDE.md) — desvinculação/limpeza de Rooms
        // ao remover um User é responsabilidade de um handler futuro, não do banco.
        builder
            .HasOne(room => room.User)
            .WithMany(user => user.Rooms)
            .HasForeignKey(room => room.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasQueryFilter(room => !room.IsDeleted);
    }
}
