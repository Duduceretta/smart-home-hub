using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SmartHomeHub.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddSystemEventsCompressionPolicy : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Compressão nativa em SystemEvents:
            // - segmentby: UserId e EventType (filtros mais frequentes no histórico)
            // - orderby: Timestamp DESC (alinhado com a ordenação temporal padrão da API)
            // - intervalo: 60 dias (2 meses). Mais generoso que os 30 dias de DeviceTelemetryLogs
            //   porque SystemEvents possui colunas de texto livre (Title, Description, OldValue,
            //   NewValue, DeviceName, RoomName, DeviceGroupName, TraceId) com volume por linha
            //   maior, mas frequência de inserção menor (eventos discretos). Mantém 60 dias
            //   quentes para auditoria recente e comprime o histórico antigo sem expurgo (sem retention).
            migrationBuilder.Sql(
                """
                ALTER TABLE "SystemEvents" SET (
                    timescaledb.compress,
                    timescaledb.compress_segmentby = '"UserId", "EventType"',
                    timescaledb.compress_orderby = '"Timestamp" DESC'
                );
                """,
                suppressTransaction: true
            );

            migrationBuilder.Sql(
                "SELECT add_compression_policy('\"SystemEvents\"', INTERVAL '60 days');",
                suppressTransaction: true
            );
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                "SELECT remove_compression_policy('\"SystemEvents\"');",
                suppressTransaction: true
            );

            migrationBuilder.Sql(
                """
                DO $$
                DECLARE chunk regclass;
                BEGIN
                    FOR chunk IN SELECT show_chunks('"SystemEvents"') LOOP
                        PERFORM decompress_chunk(chunk, if_compressed => true);
                    END LOOP;
                END $$;
                """,
                suppressTransaction: true
            );

            migrationBuilder.Sql(
                "ALTER TABLE \"SystemEvents\" SET (timescaledb.compress = false);",
                suppressTransaction: true
            );
        }
    }
}
