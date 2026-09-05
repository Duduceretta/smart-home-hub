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
        // IsRequired(false) na navegação (não na FK, que continua NOT NULL):
        // Device tem HasQueryFilter(!IsDeleted), então o EF avisa que o lado
        // "required" dessa relação pode ser filtrado do resultado (warning
        // "required end... may lead to unexpected results"). Isso é
        // intencional aqui — telemetria de um Device soft-deleted deve
        // continuar consultável (ML dataset) mesmo com o Device fora do
        // filtro padrão — daí não faz sentido espelhar o filtro em
        // DeviceTelemetryLog (Append-Only, nunca soft-deleted, CLAUDE.md).
        builder
            .HasOne(log => log.Device)
            .WithMany()
            .HasForeignKey(log => log.DeviceId)
            .IsRequired(false)
            .OnDelete(DeleteBehavior.Restrict);

        builder.Property(log => log.DeviceId).IsRequired();

        // Sem índice EF explícito em Timestamp: o TimescaleDB já cria e
        // mantém um índice nativo na dimensão de tempo da hypertable
        // (DeviceTelemetryLogs_Timestamp_idx, sem prefixo IX_) para suportar
        // chunk exclusion — o antigo IX_DeviceTelemetryLogs_Timestamp era
        // redundância estrutural sobre a MESMA coluna, confirmada via
        // pg_stat_user_indexes (zero scans em todos os chunks e na tabela
        // mestre, enquanto o índice nativo tinha milhares) e removida em
        // RemoveRedundantDeviceTelemetryLogsTimestampIndex (ver
        // backend/docs/database.md, seção 3).
    }
}
