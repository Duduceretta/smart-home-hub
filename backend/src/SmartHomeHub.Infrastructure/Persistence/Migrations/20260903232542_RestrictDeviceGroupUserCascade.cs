using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SmartHomeHub.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class RestrictDeviceGroupUserCascade : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_DeviceGroups_Users_UserId",
                table: "DeviceGroups");

            migrationBuilder.AddForeignKey(
                name: "FK_DeviceGroups_Users_UserId",
                table: "DeviceGroups",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_DeviceGroups_Users_UserId",
                table: "DeviceGroups");

            migrationBuilder.AddForeignKey(
                name: "FK_DeviceGroups_Users_UserId",
                table: "DeviceGroups",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
