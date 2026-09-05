using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SmartHomeHub.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class ReduceTelemetryCompressionPolicyTo7Days : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Só o intervalo muda (30d -> 7d) — compress_segmentby/compress_orderby
            // (AddTelemetryCompressionPolicy) e a ausência deliberada de
            // add_retention_policy permanecem intocados. remove_compression_policy
            // não decomprime chunks já comprimidos; add_compression_policy com o
            // novo intervalo passa a valer no próximo ciclo do job de compressão.
            migrationBuilder.Sql(
                "SELECT remove_compression_policy('\"DeviceTelemetryLogs\"');",
                suppressTransaction: true
            );

            migrationBuilder.Sql(
                "SELECT add_compression_policy('\"DeviceTelemetryLogs\"', INTERVAL '7 days');",
                suppressTransaction: true
            );
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                "SELECT remove_compression_policy('\"DeviceTelemetryLogs\"');",
                suppressTransaction: true
            );

            migrationBuilder.Sql(
                "SELECT add_compression_policy('\"DeviceTelemetryLogs\"', INTERVAL '30 days');",
                suppressTransaction: true
            );
        }
    }
}
