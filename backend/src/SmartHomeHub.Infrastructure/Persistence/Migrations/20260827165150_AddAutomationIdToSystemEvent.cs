using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SmartHomeHub.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddAutomationIdToSystemEvent : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "AutomationId",
                table: "SystemEvents",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_SystemEvents_AutomationId",
                table: "SystemEvents",
                column: "AutomationId");

            migrationBuilder.AddForeignKey(
                name: "FK_SystemEvents_Automations_AutomationId",
                table: "SystemEvents",
                column: "AutomationId",
                principalTable: "Automations",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_SystemEvents_Automations_AutomationId",
                table: "SystemEvents");

            migrationBuilder.DropIndex(
                name: "IX_SystemEvents_AutomationId",
                table: "SystemEvents");

            migrationBuilder.DropColumn(
                name: "AutomationId",
                table: "SystemEvents");
        }
    }
}
