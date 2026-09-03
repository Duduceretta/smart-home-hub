using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SmartHomeHub.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class SetDeviceTelemetryLogsChunkInterval : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Torna explícito o valor que já está em vigor hoje (confirmado contra
            // timescaledb_information.dimensions antes desta migration: 7 dias) — a
            // hypertable foi criada em AddDeviceTelemetryLog via create_hypertable sem
            // chunk_time_interval, caindo no default implícito do Timescale. ALTER, não
            // recria a hypertable: set_chunk_time_interval não mexe nos chunks já
            // existentes, só define o intervalo dos chunks futuros. Não é mudança de
            // valor — só remove a dependência de saber o default da versão instalada.
            migrationBuilder.Sql(
                "SELECT set_chunk_time_interval('\"DeviceTelemetryLogs\"', INTERVAL '7 days');"
            );
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Nada a reverter: o valor de 7 dias já era o efetivo (implícito) antes
            // desta migration existir. Down() não tem um "voltar a ser implícito" —
            // deixar setado explicitamente em 7 dias não muda comportamento algum.
        }
    }
}
