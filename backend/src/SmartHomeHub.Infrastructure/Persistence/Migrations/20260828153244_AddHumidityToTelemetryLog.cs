using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SmartHomeHub.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddHumidityToTelemetryLog : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<double>(
                name: "HumidityPercent",
                table: "DeviceTelemetryLogs",
                type: "double precision",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "HumidityPercent",
                table: "DeviceTelemetryLogs");
        }
    }
}
