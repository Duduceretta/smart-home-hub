using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SmartHomeHub.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddSystemEventsCompositeTemporalIndexes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_SystemEvents_UserId_DeviceGroupId_Timestamp",
                table: "SystemEvents",
                columns: new[] { "UserId", "DeviceGroupId", "Timestamp" },
                descending: new[] { false, false, true });

            migrationBuilder.CreateIndex(
                name: "IX_SystemEvents_UserId_DeviceId_Timestamp",
                table: "SystemEvents",
                columns: new[] { "UserId", "DeviceId", "Timestamp" },
                descending: new[] { false, false, true });

            migrationBuilder.CreateIndex(
                name: "IX_SystemEvents_UserId_RoomId_Timestamp",
                table: "SystemEvents",
                columns: new[] { "UserId", "RoomId", "Timestamp" },
                descending: new[] { false, false, true });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_SystemEvents_UserId_DeviceGroupId_Timestamp",
                table: "SystemEvents");

            migrationBuilder.DropIndex(
                name: "IX_SystemEvents_UserId_DeviceId_Timestamp",
                table: "SystemEvents");

            migrationBuilder.DropIndex(
                name: "IX_SystemEvents_UserId_RoomId_Timestamp",
                table: "SystemEvents");
        }
    }
}
