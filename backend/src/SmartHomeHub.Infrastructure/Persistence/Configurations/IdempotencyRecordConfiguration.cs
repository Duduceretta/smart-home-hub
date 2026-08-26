using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SmartHomeHub.Domain.Entities;

namespace SmartHomeHub.Infrastructure.Persistence.Configurations;

public class IdempotencyRecordConfiguration : IEntityTypeConfiguration<IdempotencyRecord>
{
    public void Configure(EntityTypeBuilder<IdempotencyRecord> builder)
    {
        builder.HasKey(record => record.Id);

        builder.Property(record => record.Id).HasMaxLength(128);

        builder.Property(record => record.CreatedAt).IsRequired();

        // Suporta uma futura rotina de limpeza por TTL (registros antigos não
        // precisam ser mantidos para sempre — só durante a janela de retry do Hangfire).
        builder.HasIndex(record => record.CreatedAt);
    }
}
