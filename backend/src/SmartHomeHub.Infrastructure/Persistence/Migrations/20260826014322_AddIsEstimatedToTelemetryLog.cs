using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SmartHomeHub.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddIsEstimatedToTelemetryLog : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsEstimated",
                table: "DeviceTelemetryLogs",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsEstimated",
                table: "DeviceTelemetryLogs");
        }
    }
}
