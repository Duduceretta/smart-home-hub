using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SmartHomeHub.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddEventHistoryFieldsToSystemEvent : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "DeviceGroupId",
                table: "SystemEvents",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DeviceGroupName",
                table: "SystemEvents",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DeviceName",
                table: "SystemEvents",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "NewValue",
                table: "SystemEvents",
                type: "character varying(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "OldValue",
                table: "SystemEvents",
                type: "character varying(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "RoomId",
                table: "SystemEvents",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RoomName",
                table: "SystemEvents",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Severity",
                table: "SystemEvents",
                type: "integer",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.AddColumn<int>(
                name: "Source",
                table: "SystemEvents",
                type: "integer",
                nullable: false,
                defaultValue: 3);

            migrationBuilder.CreateIndex(
                name: "IX_SystemEvents_DeviceGroupId",
                table: "SystemEvents",
                column: "DeviceGroupId");

            migrationBuilder.CreateIndex(
                name: "IX_SystemEvents_RoomId",
                table: "SystemEvents",
                column: "RoomId");

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

            migrationBuilder.CreateIndex(
                name: "IX_SystemEvents_UserId_Severity",
                table: "SystemEvents",
                columns: new[] { "UserId", "Severity" });

            migrationBuilder.CreateIndex(
                name: "IX_SystemEvents_UserId_Source",
                table: "SystemEvents",
                columns: new[] { "UserId", "Source" });

            migrationBuilder.AddForeignKey(
                name: "FK_SystemEvents_DeviceGroups_DeviceGroupId",
                table: "SystemEvents",
                column: "DeviceGroupId",
                principalTable: "DeviceGroups",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_SystemEvents_Rooms_RoomId",
                table: "SystemEvents",
                column: "RoomId",
                principalTable: "Rooms",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_SystemEvents_DeviceGroups_DeviceGroupId",
                table: "SystemEvents");

            migrationBuilder.DropForeignKey(
                name: "FK_SystemEvents_Rooms_RoomId",
                table: "SystemEvents");

            migrationBuilder.DropIndex(
                name: "IX_SystemEvents_DeviceGroupId",
                table: "SystemEvents");

            migrationBuilder.DropIndex(
                name: "IX_SystemEvents_RoomId",
                table: "SystemEvents");

            migrationBuilder.DropIndex(
                name: "IX_SystemEvents_UserId_DeviceGroupId",
                table: "SystemEvents");

            migrationBuilder.DropIndex(
                name: "IX_SystemEvents_UserId_DeviceId",
                table: "SystemEvents");

            migrationBuilder.DropIndex(
                name: "IX_SystemEvents_UserId_RoomId",
                table: "SystemEvents");

            migrationBuilder.DropIndex(
                name: "IX_SystemEvents_UserId_Severity",
                table: "SystemEvents");

            migrationBuilder.DropIndex(
                name: "IX_SystemEvents_UserId_Source",
                table: "SystemEvents");

            migrationBuilder.DropColumn(
                name: "DeviceGroupId",
                table: "SystemEvents");

            migrationBuilder.DropColumn(
                name: "DeviceGroupName",
                table: "SystemEvents");

            migrationBuilder.DropColumn(
                name: "DeviceName",
                table: "SystemEvents");

            migrationBuilder.DropColumn(
                name: "NewValue",
                table: "SystemEvents");

            migrationBuilder.DropColumn(
                name: "OldValue",
                table: "SystemEvents");

            migrationBuilder.DropColumn(
                name: "RoomId",
                table: "SystemEvents");

            migrationBuilder.DropColumn(
                name: "RoomName",
                table: "SystemEvents");

            migrationBuilder.DropColumn(
                name: "Severity",
                table: "SystemEvents");

            migrationBuilder.DropColumn(
                name: "Source",
                table: "SystemEvents");
        }
    }
}
