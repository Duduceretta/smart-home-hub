using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SmartHomeHub.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class CreateDeviceLiveStatesTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "DeviceLiveStates",
                columns: table => new
                {
                    DeviceId = table.Column<Guid>(type: "uuid", nullable: false),
                    IsOn = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    IsOnline = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    LastSeenAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    Attributes = table.Column<string>(type: "jsonb", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DeviceLiveStates", x => x.DeviceId);
                    table.ForeignKey(
                        name: "FK_DeviceLiveStates_Devices_DeviceId",
                        column: x => x.DeviceId,
                        principalTable: "Devices",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            // Migração de dados: popula DeviceLiveStates com o estado atual de cada Device
            // preservando atributos de brilho, cor e temperatura de cor dentro de Attributes (jsonb)
            migrationBuilder.Sql(
                """
                INSERT INTO "DeviceLiveStates" ("DeviceId", "IsOn", "IsOnline", "LastSeenAt", "Attributes")
                SELECT 
                    "Id",
                    "IsOn",
                    "IsOnline",
                    "LastSeenAt",
                    json_build_object(
                        'Brightness', "Brightness",
                        'ColorHex', "ColorHex",
                        'ColorTempPercent', "ColorTempPercent"
                    )::jsonb
                FROM "Devices"
                ON CONFLICT ("DeviceId") DO NOTHING;
                """
            );
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "DeviceLiveStates");
        }
    }
}
