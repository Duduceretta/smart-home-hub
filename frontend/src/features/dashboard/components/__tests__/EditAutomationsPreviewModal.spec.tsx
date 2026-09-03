import { describe, expect, it, vi } from "vitest";
import { renderWithProviders, screen, userEvent } from "@/testing/test-utils";
import type { DashboardAutomationSummary } from "../../types/dashboard.types";
import { EditAutomationsPreviewModal } from "../EditAutomationsPreviewModal";

const automationsMock: DashboardAutomationSummary[] = [
	{
		id: "auto-1",
		name: "Luzes do Jardim",
		isActive: true,
		createdAt: "2026-01-01T00:00:00Z",
		updatedAt: "2026-01-01T00:00:00Z",
		lastExecutedAt: null,
	},
	{
		id: "auto-2",
		name: "Cafeteira Matinal",
		isActive: false,
		createdAt: "2026-01-02T00:00:00Z",
		updatedAt: "2026-01-02T00:00:00Z",
		lastExecutedAt: null,
	},
	{
		id: "auto-3",
		name: "Ar Condicionado Noite",
		isActive: true,
		createdAt: "2026-01-03T00:00:00Z",
		updatedAt: "2026-01-03T00:00:00Z",
		lastExecutedAt: null,
	},
	{
		id: "auto-4",
		name: "Trancar Portas",
		isActive: true,
		createdAt: "2026-01-04T00:00:00Z",
		updatedAt: "2026-01-04T00:00:00Z",
		lastExecutedAt: null,
	},
];

describe("EditAutomationsPreviewModal Integration Tests", () => {
	it("EditAutomationsPreviewModal_Closed_ShouldNotRenderContent", () => {
		// Act
		renderWithProviders(
			<EditAutomationsPreviewModal
				isOpen={false}
				onClose={vi.fn()}
				automations={automationsMock}
				selectedIds={["auto-1", "auto-2"]}
				onSave={vi.fn()}
				onReset={vi.fn()}
			/>,
		);

		// Assert
		expect(screen.queryByText("Luzes do Jardim")).not.toBeInTheDocument();
	});

	it("EditAutomationsPreviewModal_Open_ShouldRenderAutomationsWithCheckboxes", () => {
		// Act
		renderWithProviders(
			<EditAutomationsPreviewModal
				isOpen
				onClose={vi.fn()}
				automations={automationsMock}
				selectedIds={["auto-1", "auto-2"]}
				onSave={vi.fn()}
				onReset={vi.fn()}
			/>,
		);

		// Assert
		expect(
			screen.getByRole("checkbox", { name: /Luzes do Jardim/ }),
		).toBeChecked();
		expect(
			screen.getByRole("checkbox", { name: /Cafeteira Matinal/ }),
		).toBeChecked();
		expect(
			screen.getByRole("checkbox", { name: /Ar Condicionado Noite/ }),
		).not.toBeChecked();
	});

	it("EditAutomationsPreviewModal_ReorderItems_ShouldCallOnSaveWithNewOrder", async () => {
		// Arrange
		const onSave = vi.fn();
		const user = userEvent.setup();

		renderWithProviders(
			<EditAutomationsPreviewModal
				isOpen
				onClose={vi.fn()}
				automations={automationsMock}
				selectedIds={["auto-1", "auto-2"]}
				onSave={onSave}
				onReset={vi.fn()}
			/>,
		);

		// Act: Mover auto-2 para cima (#1)
		const downButtons = screen.getAllByRole("button", {
			name: /Mover para cima/i,
		});
		await user.click(downButtons[1]); // Segundo item (auto-2) move para cima

		// Clicar em salvar
		const saveButton = screen.getByRole("button", { name: /Salvar/i });
		await user.click(saveButton);

		// Assert: ordem invertida para ["auto-2", "auto-1"]
		expect(onSave).toHaveBeenCalledWith(["auto-2", "auto-1"]);
	});

	it("EditAutomationsPreviewModal_ResetToAuto_ShouldCallOnReset", async () => {
		// Arrange
		const onReset = vi.fn();
		const user = userEvent.setup();

		renderWithProviders(
			<EditAutomationsPreviewModal
				isOpen
				onClose={vi.fn()}
				automations={automationsMock}
				selectedIds={["auto-1"]}
				onSave={vi.fn()}
				onReset={onReset}
			/>,
		);

		// Act
		const resetButton = screen.getByRole("button", {
			name: /Usar automático/i,
		});
		await user.click(resetButton);

		// Assert
		expect(onReset).toHaveBeenCalled();
	});
});
