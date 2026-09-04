using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SmartHomeHub.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class RemoveLegacyDeviceColumns : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Brightness",
                table: "Devices");

            migrationBuilder.DropColumn(
                name: "ColorHex",
                table: "Devices");

            migrationBuilder.DropColumn(
                name: "ColorTempPercent",
                table: "Devices");

            migrationBuilder.DropColumn(
                name: "IsOn",
                table: "Devices");

            migrationBuilder.DropColumn(
                name: "IsOnline",
                table: "Devices");

            migrationBuilder.DropColumn(
                name: "LastSeenAt",
                table: "Devices");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "Brightness",
                table: "Devices",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ColorHex",
                table: "Devices",
                type: "character varying(7)",
                maxLength: 7,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ColorTempPercent",
                table: "Devices",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsOn",
                table: "Devices",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "IsOnline",
                table: "Devices",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "LastSeenAt",
                table: "Devices",
                type: "timestamp with time zone",
                nullable: true);
        }
    }
}
