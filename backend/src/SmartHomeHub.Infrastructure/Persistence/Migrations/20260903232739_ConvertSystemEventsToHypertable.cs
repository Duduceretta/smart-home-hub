using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SmartHomeHub.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class ConvertSystemEventsToHypertable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropPrimaryKey(
                name: "PK_SystemEvents",
                table: "SystemEvents");

            migrationBuilder.AddPrimaryKey(
                name: "PK_SystemEvents",
                table: "SystemEvents",
                columns: new[] { "Id", "Timestamp" });

            // migrate_data => true: SystemEvents já existe com linhas (ao contrário de
            // DeviceTelemetryLogs, que virou hypertable na mesma migration que criou a
            // tabela). Chunk mensal (não os 7 dias implícitos da telemetria): volume por
            // evento discreto é bem menor, não justifica chunk mais granular.
            migrationBuilder.Sql(
                """
                SELECT create_hypertable(
                    '"SystemEvents"',
                    'Timestamp',
                    chunk_time_interval => INTERVAL '1 month',
                    migrate_data => true
                );
                """
            );
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // TimescaleDB não tem um "drop_hypertable" que reverta pra tabela comum
            // preservando os dados — reverter de verdade exigiria recriar a tabela do
            // zero. Down() aqui só desfaz a troca de PK; a hypertable em si fica.
            migrationBuilder.DropPrimaryKey(
                name: "PK_SystemEvents",
                table: "SystemEvents");

            migrationBuilder.AddPrimaryKey(
                name: "PK_SystemEvents",
                table: "SystemEvents",
                column: "Id");
        }
    }
}
