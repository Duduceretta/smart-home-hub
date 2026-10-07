using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SmartHomeHub.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddSceneToSystemEvents : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "SceneId",
                table: "SystemEvents",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SceneName",
                table: "SystemEvents",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_SystemEvents_SceneId",
                table: "SystemEvents",
                column: "SceneId");

            migrationBuilder.AddForeignKey(
                name: "FK_SystemEvents_Scenes_SceneId",
                table: "SystemEvents",
                column: "SceneId",
                principalTable: "Scenes",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_SystemEvents_Scenes_SceneId",
                table: "SystemEvents");

            migrationBuilder.DropIndex(
                name: "IX_SystemEvents_SceneId",
                table: "SystemEvents");

            migrationBuilder.DropColumn(
                name: "SceneId",
                table: "SystemEvents");

            migrationBuilder.DropColumn(
                name: "SceneName",
                table: "SystemEvents");
        }
    }
}
