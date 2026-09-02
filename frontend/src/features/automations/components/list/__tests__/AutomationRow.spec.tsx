import { describe, expect, it, vi } from "vitest";
import { renderWithProviders, screen, userEvent } from "@/testing/test-utils";
import type { AutomationView } from "../../../types/automations.types";
import { AutomationRow } from "../AutomationRow";

function createAutomationViewMock(
	overrides?: Partial<AutomationView>,
): AutomationView {
	return {
		id: "auto-1",
		name: "Ligar luzes do jardim",
		isActive: true,
		isDraft: false,
		triggerKind: "schedule",
		triggerSummary: "Todos os dias às 18:00",
		conditionSummary: null,
		actionSummaries: ["Ligar Refletor"],
		rulePayload: "{}",
		createdAt: "2026-08-01T12:00:00Z",
		updatedAt: "2026-08-10T15:30:00Z",
		lastExecutedAt: "2026-08-25T18:00:00Z",
		hasFailedToday: false,
		...overrides,
	};
}

describe("AutomationRow Integration Tests", () => {
	it("AutomationRow_ActiveAutomation_ShouldRenderNameSummaryAndActiveSwitch", () => {
		// Arrange
		const automation = createAutomationViewMock({
			name: "Luzes do Jardim",
			isActive: true,
			triggerSummary: "Todos os dias às 18:00",
		});
		const onSelect = vi.fn();
		const onToggle = vi.fn();

		// Act
		renderWithProviders(
			<AutomationRow
				automation={automation}
				isSelected={false}
				onSelect={onSelect}
				onToggle={onToggle}
			/>,
		);

		// Assert
		expect(screen.getByText("Luzes do Jardim")).toBeInTheDocument();
		expect(screen.getByText("Todos os dias às 18:00")).toBeInTheDocument();
		const toggleSwitch = screen.getByRole("switch", {
			name: "Desativar automação Luzes do Jardim",
		});
		expect(toggleSwitch).toBeInTheDocument();
		expect(toggleSwitch).toBeChecked();
	});

	it("AutomationRow_DraftAutomation_ShouldRenderIncompleteBadgeAndNoSwitch", () => {
		// Arrange
		const automation = createAutomationViewMock({
			name: "Rascunho Sem Gatilho",
			isDraft: true,
			isActive: false,
		});
		const onSelect = vi.fn();
		const onToggle = vi.fn();

		// Act
		renderWithProviders(
			<AutomationRow
				automation={automation}
				isSelected={false}
				onSelect={onSelect}
				onToggle={onToggle}
			/>,
		);

		// Assert
		expect(screen.getByText("Rascunho Sem Gatilho")).toBeInTheDocument();
		expect(screen.getByText("Incompleta")).toBeInTheDocument();
		expect(screen.getByText("Sem gatilho configurado")).toBeInTheDocument();
		expect(screen.queryByRole("switch")).not.toBeInTheDocument();
	});

	it("AutomationRow_ClickRow_ShouldTriggerOnSelectWithAutomationId", async () => {
		// Arrange
		const automation = createAutomationViewMock({ id: "target-auto-id" });
		const onSelect = vi.fn();
		const onToggle = vi.fn();
		const user = userEvent.setup();

		renderWithProviders(
			<AutomationRow
				automation={automation}
				isSelected={false}
				onSelect={onSelect}
				onToggle={onToggle}
			/>,
		);

		// Act
		await user.click(screen.getByRole("button"));

		// Assert
		expect(onSelect).toHaveBeenCalledTimes(1);
		expect(onSelect).toHaveBeenCalledWith("target-auto-id");
	});

	it("AutomationRow_KeyDownEnterOrSpace_ShouldTriggerOnSelect", async () => {
		// Arrange
		const automation = createAutomationViewMock({ id: "key-auto-id" });
		const onSelect = vi.fn();
		const onToggle = vi.fn();
		const user = userEvent.setup();

		renderWithProviders(
			<AutomationRow
				automation={automation}
				isSelected={false}
				onSelect={onSelect}
				onToggle={onToggle}
			/>,
		);

		// Act
		const rowButton = screen.getByRole("button");
		rowButton.focus();
		await user.keyboard("{Enter}");
		await user.keyboard(" ");
		await user.keyboard("{Escape}");

		// Assert
		expect(onSelect).toHaveBeenCalledTimes(2);
		expect(onSelect).toHaveBeenCalledWith("key-auto-id");
	});

	it("AutomationRow_ToggleSwitch_ShouldCallOnToggleAndStopPropagation", async () => {
		// Arrange
		const automation = createAutomationViewMock({
			id: "toggle-auto-id",
			name: "Lâmpada Quarto",
			isActive: true,
		});
		const onSelect = vi.fn();
		const onToggle = vi.fn();
		const user = userEvent.setup();

		renderWithProviders(
			<AutomationRow
				automation={automation}
				isSelected={false}
				onSelect={onSelect}
				onToggle={onToggle}
			/>,
		);

		// Act
		const switchElement = screen.getByRole("switch", {
			name: "Desativar automação Lâmpada Quarto",
		});
		await user.click(switchElement);

		// Assert
		expect(onToggle).toHaveBeenCalledTimes(1);
		expect(onToggle).toHaveBeenCalledWith("toggle-auto-id", false);
		expect(onSelect).not.toHaveBeenCalled();
	});

	it("AutomationRow_Selected_ShouldHaveAriaCurrentTrue", () => {
		// Arrange
		const automation = createAutomationViewMock({ id: "selected-auto" });

		// Act
		renderWithProviders(
			<AutomationRow
				automation={automation}
				isSelected={true}
				onSelect={vi.fn()}
				onToggle={vi.fn()}
			/>,
		);

		// Assert
		const row = screen.getByRole("button");
		expect(row).toHaveAttribute("aria-current", "true");
	});
});
