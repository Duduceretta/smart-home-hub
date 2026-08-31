using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SmartHomeHub.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class BackfillLegacySystemEvents : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Backfill conservador para registros históricos pré-existentes na tabela SystemEvents (~93 registros).
            // Como estes eventos foram gravados antes da introdução dos campos Severity, Source e dos snapshots
            // desnormalizados (DeviceName/RoomName), adotamos:
            // 1. Severity = 1 (Info) e Source = 3 (System) como fallback conservador, pois não há telemetria original suficiente para reclassificá-los.
            // 2. Snapshot de DeviceName, RoomId e RoomName resolvidos a partir dos Devices/Rooms atuais para eventos que possuíam DeviceId vinculado.
            migrationBuilder.Sql(
                @"
                -- 1. Preenche snapshots de DeviceName e RoomName a partir da tabela Devices/Rooms
                UPDATE ""SystemEvents"" se
                SET
                    ""DeviceName"" = COALESCE(se.""DeviceName"", d.""Name""),
                    ""RoomId"" = COALESCE(se.""RoomId"", d.""RoomId""),
                    ""RoomName"" = COALESCE(se.""RoomName"", r.""Name"")
                FROM ""Devices"" d
                LEFT JOIN ""Rooms"" r ON r.""Id"" = d.""RoomId""
                WHERE se.""DeviceId"" = d.""Id""
                  AND (se.""DeviceName"" IS NULL OR se.""RoomName"" IS NULL);

                -- 2. Garante Severity = Info (1) para dados legados sem severidade definida (0)
                UPDATE ""SystemEvents""
                SET ""Severity"" = 1
                WHERE ""Severity"" = 0;

                -- 3. Garante Source = System (3) para dados legados sem origem definida (0)
                UPDATE ""SystemEvents""
                SET ""Source"" = 3
                WHERE ""Source"" = 0;
                "
            );
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // O backfill é idempotente e irreversível por ser enriquecimento de dados existentes.
        }
    }
}
