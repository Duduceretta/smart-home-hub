using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SmartHomeHub.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class SetDeviceRoomSetNullAndRemoveRedundantSystemEventsIndexes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Devices_Rooms_RoomId",
                table: "Devices");

            migrationBuilder.DropIndex(
                name: "IX_SystemEvents_UserId_DeviceGroupId",
                table: "SystemEvents");

            migrationBuilder.DropIndex(
                name: "IX_SystemEvents_UserId_DeviceId",
                table: "SystemEvents");

            migrationBuilder.DropIndex(
                name: "IX_SystemEvents_UserId_RoomId",
                table: "SystemEvents");

            migrationBuilder.AddForeignKey(
                name: "FK_Devices_Rooms_RoomId",
                table: "Devices",
                column: "RoomId",
                principalTable: "Rooms",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Devices_Rooms_RoomId",
                table: "Devices");

            migrationBuilder.CreateIndex(
                name: "IX_SystemEvents_UserId_DeviceGroupId",
                table: "SystemEvents",
                columns: new[] { "UserId", "DeviceGroupId" });

            migrationBuilder.CreateIndex(
                name: "IX_SystemEvents_UserId_DeviceId",
                table: "SystemEvents",
                columns: new[] { "UserId", "DeviceId" });

            migrationBuilder.CreateIndex(
                name: "IX_SystemEvents_UserId_RoomId",
                table: "SystemEvents",
                columns: new[] { "UserId", "RoomId" });

            migrationBuilder.AddForeignKey(
                name: "FK_Devices_Rooms_RoomId",
                table: "Devices",
                column: "RoomId",
                principalTable: "Rooms",
                principalColumn: "Id");
        }
    }
}
