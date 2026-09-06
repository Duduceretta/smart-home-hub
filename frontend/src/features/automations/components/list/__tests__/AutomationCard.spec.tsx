import { describe, expect, it, vi } from "vitest";
import { renderWithProviders, screen, userEvent } from "@/testing/test-utils";
import type { AutomationView } from "../../types/automations.types";
import { AutomationCard } from "../AutomationCard";

describe("AutomationCard Integration Tests", () => {
	const baseAutomation: AutomationView = {
		id: "auto-1",
		name: "Desligar Luzes Noturnas",
		isActive: true,
		isDraft: false,
		triggerKind: "schedule",
		triggerSummary: "Todos os dias às 23:00",
		conditionSummary: "Sala de Estar (estado) = ligado",
		actionSummaries: ["Desligar Luz Principal"],
		rulePayload: "{}",
		createdAt: "2026-09-01T00:00:00Z",
		updatedAt: "2026-09-01T00:00:00Z",
		lastExecutedAt: null,
		hasFailedToday: false,
	};

	it("AutomationCard_ActiveItem_ShouldRenderDetailsAndActiveSwitch", () => {
		// Arrange & Act
		renderWithProviders(
			<AutomationCard
				automation={baseAutomation}
				isSelected={false}
				onSelect={vi.fn()}
				onToggle={vi.fn()}
			/>,
		);

		// Assert
		expect(screen.getByText("Desligar Luzes Noturnas")).toBeInTheDocument();
		expect(screen.getByText("Todos os dias às 23:00")).toBeInTheDocument();
		const toggleSwitch = screen.getByRole("switch");
		expect(toggleSwitch).toBeInTheDocument();
		expect(toggleSwitch).toBeChecked();
	});

	it("AutomationCard_DraftItem_ShouldShowIncompletaBadgeAndHideSwitch", () => {
		// Arrange
		const draftAutomation: AutomationView = {
			...baseAutomation,
			id: "auto-draft",
			name: "Rascunho Novo",
			isDraft: true,
			isActive: false,
		};

		// Act
		renderWithProviders(
			<AutomationCard
				automation={draftAutomation}
				isSelected={false}
				onSelect={vi.fn()}
				onToggle={vi.fn()}
			/>,
		);

		// Assert
		expect(screen.getByText("Rascunho Novo")).toBeInTheDocument();
		expect(screen.getByText("Incompleta")).toBeInTheDocument();
		expect(screen.queryByRole("switch")).not.toBeInTheDocument();
	});

	it("AutomationCard_ClickCardBody_ShouldCallOnSelect", async () => {
		// Arrange
		const user = userEvent.setup();
		const onSelectSpy = vi.fn();
		const onToggleSpy = vi.fn();

		renderWithProviders(
			<AutomationCard
				automation={baseAutomation}
				isSelected={false}
				onSelect={onSelectSpy}
				onToggle={onToggleSpy}
			/>,
		);

		// Act
		const card = screen.getByRole("button", {
			name: /Desligar Luzes Noturnas/i,
		});
		await user.click(card);

		// Assert
		expect(onSelectSpy).toHaveBeenCalledTimes(1);
		expect(onSelectSpy).toHaveBeenCalledWith("auto-1");
		expect(onToggleSpy).not.toHaveBeenCalled();
	});

	it("AutomationCard_KeyboardEnterOrSpace_ShouldCallOnSelect", async () => {
		// Arrange
		const user = userEvent.setup();
		const onSelectSpy = vi.fn();

		renderWithProviders(
			<AutomationCard
				automation={baseAutomation}
				isSelected={false}
				onSelect={onSelectSpy}
				onToggle={vi.fn()}
			/>,
		);

		// Act
		const card = screen.getByRole("button", {
			name: /Desligar Luzes Noturnas/i,
		});
		card.focus();
		await user.keyboard("{Enter}");
		await user.keyboard(" ");

		// Assert
		expect(onSelectSpy).toHaveBeenCalledTimes(2);
		expect(onSelectSpy).toHaveBeenLastCalledWith("auto-1");
	});

	it("AutomationCard_ToggleSwitch_ShouldCallOnToggleWithoutCallingOnSelect", async () => {
		// Arrange
		const user = userEvent.setup();
		const onSelectSpy = vi.fn();
		const onToggleSpy = vi.fn();

		renderWithProviders(
			<AutomationCard
				automation={baseAutomation}
				isSelected={false}
				onSelect={onSelectSpy}
				onToggle={onToggleSpy}
			/>,
		);

		// Act
		const toggleSwitch = screen.getByRole("switch");
		await user.click(toggleSwitch);

		// Assert
		expect(onToggleSpy).toHaveBeenCalledTimes(1);
		expect(onToggleSpy).toHaveBeenCalledWith("auto-1", false);
		expect(onSelectSpy).not.toHaveBeenCalled();
	});

	it("AutomationCard_WhenSelected_ShouldHaveAriaCurrentTrueAndSelectedStyles", () => {
		// Arrange & Act
		renderWithProviders(
			<AutomationCard
				automation={baseAutomation}
				isSelected={true}
				onSelect={vi.fn()}
				onToggle={vi.fn()}
			/>,
		);

		// Assert
		const card = screen.getByRole("button", {
			name: /Desligar Luzes Noturnas/i,
		});
		expect(card).toHaveAttribute("aria-current", "true");
		expect(card.className).toContain("bg-primary/10");
	});
});
