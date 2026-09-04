using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SmartHomeHub.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class RestrictRemainingCascades : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Automations_Users_UserId",
                table: "Automations");

            migrationBuilder.DropForeignKey(
                name: "FK_DeviceTelemetryLogs_Devices_DeviceId",
                table: "DeviceTelemetryLogs");

            migrationBuilder.DropForeignKey(
                name: "FK_SystemEvents_Users_UserId",
                table: "SystemEvents");

            migrationBuilder.AddForeignKey(
                name: "FK_Automations_Users_UserId",
                table: "Automations",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_DeviceTelemetryLogs_Devices_DeviceId",
                table: "DeviceTelemetryLogs",
                column: "DeviceId",
                principalTable: "Devices",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_SystemEvents_Users_UserId",
                table: "SystemEvents",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Automations_Users_UserId",
                table: "Automations");

            migrationBuilder.DropForeignKey(
                name: "FK_DeviceTelemetryLogs_Devices_DeviceId",
                table: "DeviceTelemetryLogs");

            migrationBuilder.DropForeignKey(
                name: "FK_SystemEvents_Users_UserId",
                table: "SystemEvents");

            migrationBuilder.AddForeignKey(
                name: "FK_Automations_Users_UserId",
                table: "Automations",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_DeviceTelemetryLogs_Devices_DeviceId",
                table: "DeviceTelemetryLogs",
                column: "DeviceId",
                principalTable: "Devices",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_SystemEvents_Users_UserId",
                table: "SystemEvents",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
