using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SmartHomeHub.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddAutomationTriggerKindAndDraft : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsDraft",
                table: "Automations",
                type: "boolean",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<int>(
                name: "TriggerKind",
                table: "Automations",
                type: "integer",
                nullable: false,
                defaultValue: 2);

            // Backfill dos registros já existentes — TriggerKind/IsDraft
            // continuam sendo escritos pelo C# (Create/UpdateAutomationCommand)
            // daqui em diante; isso só preenche os que foram criados antes
            // dessas colunas existirem, lendo o mesmo RulePayload (jsonb) que
            // já é a fonte de verdade. TriggerKind 1=Schedule, 2=Sensor.
            migrationBuilder.Sql(
                """
                UPDATE "Automations"
                SET
                    "TriggerKind" = CASE
                        WHEN jsonb_array_length(COALESCE("RulePayload"->'triggers', '[]'::jsonb)) > 0
                             AND ("RulePayload"->'triggers'->0->>'type') = 'time'
                        THEN 1
                        ELSE 2
                    END,
                    "IsDraft" = (
                        jsonb_array_length(COALESCE("RulePayload"->'triggers', '[]'::jsonb)) = 0
                        OR jsonb_array_length(COALESCE("RulePayload"->'actions', '[]'::jsonb)) = 0
                    );
                """
            );
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsDraft",
                table: "Automations");

            migrationBuilder.DropColumn(
                name: "TriggerKind",
                table: "Automations");
        }
    }
}
