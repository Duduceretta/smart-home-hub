using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SmartHomeHub.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddDeviceTelemetryLog : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "DeviceTelemetryLogs",
                columns: table => new
                {
                    Timestamp = table.Column<DateTimeOffset>(
                        type: "timestamp with time zone",
                        nullable: false
                    ),
                    DeviceId = table.Column<Guid>(type: "uuid", nullable: false),
                    IsOn = table.Column<bool>(type: "boolean", nullable: false),
                    Voltage = table.Column<int>(type: "integer", nullable: true),
                    SignalStrength = table.Column<string>(type: "text", nullable: true),
                },
                constraints: table =>
                {
                    table.PrimaryKey(
                        "PK_DeviceTelemetryLogs",
                        x => new { x.DeviceId, x.Timestamp }
                    );
                    table.ForeignKey(
                        name: "FK_DeviceTelemetryLogs_Devices_DeviceId",
                        column: x => x.DeviceId,
                        principalTable: "Devices",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade
                    );
                }
            );

            migrationBuilder.Sql(
                "SELECT create_hypertable('\"DeviceTelemetryLogs\"', 'Timestamp');"
            );
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "DeviceTelemetryLogs");
        }
    }
}
