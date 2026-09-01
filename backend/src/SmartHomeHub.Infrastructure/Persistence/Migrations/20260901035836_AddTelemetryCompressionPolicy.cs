using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SmartHomeHub.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddTelemetryCompressionPolicy : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                CREATE MATERIALIZED VIEW device_telemetry_daily
                WITH (timescaledb.continuous) AS
                SELECT
                    "DeviceId",
                    time_bucket('1 day', "Timestamp") AS bucket,
                    avg("PowerUsageWatts") AS avg_power_watts,
                    max("PowerUsageWatts") AS max_power_watts,
                    avg("TemperatureCelsius") AS avg_temperature
                FROM "DeviceTelemetryLogs"
                GROUP BY "DeviceId", bucket;
                """
            );

            migrationBuilder.Sql(
                """
                SELECT add_continuous_aggregate_policy('device_telemetry_daily',
                    start_offset => INTERVAL '3 days',
                    end_offset => INTERVAL '1 day',
                    schedule_interval => INTERVAL '1 day');
                """
            );

            migrationBuilder.Sql(
                """
                ALTER TABLE "DeviceTelemetryLogs" SET (
                    timescaledb.compress,
                    timescaledb.compress_segmentby = '"DeviceId"',
                    timescaledb.compress_orderby = '"Timestamp" DESC'
                );
                """
            );

            migrationBuilder.Sql(
                "SELECT add_compression_policy('\"DeviceTelemetryLogs\"', INTERVAL '30 days');"
            );
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                "SELECT remove_compression_policy('\"DeviceTelemetryLogs\"');"
            );

            migrationBuilder.Sql(
                """
                DO $$
                DECLARE chunk regclass;
                BEGIN
                    FOR chunk IN SELECT show_chunks('"DeviceTelemetryLogs"') LOOP
                        PERFORM decompress_chunk(chunk, if_compressed => true);
                    END LOOP;
                END $$;
                """
            );

            migrationBuilder.Sql(
                "ALTER TABLE \"DeviceTelemetryLogs\" SET (timescaledb.compress = false);"
            );

            migrationBuilder.Sql(
                "DROP MATERIALIZED VIEW IF EXISTS device_telemetry_daily;"
            );
        }
    }
}
