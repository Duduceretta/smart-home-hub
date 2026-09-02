import { describe, expect, it, vi } from "vitest";
import type { AutomationFilterCounts } from "@/features/automations/types/automations.types";
import { renderWithProviders, screen, userEvent } from "@/testing/test-utils";
import { AutomationFilterChips } from "../AutomationFilterChips";

const mockCounts: AutomationFilterCounts = {
	total: 10,
	active: 6,
	inactive: 4,
	schedule: 3,
	sensor: 5,
	draft: 2,
};

describe("AutomationFilterChips Integration Tests", () => {
	it("AutomationFilterChips_Rendered_ShouldShowEachChipWithItsLabelAndCount", () => {
		// Act
		renderWithProviders(
			<AutomationFilterChips
				filter="all"
				onFilterChange={vi.fn()}
				counts={mockCounts}
			/>,
		);

		// Assert
		expect(screen.getByRole("button", { name: /^Todas/i })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /^Ativas/i })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /^Inativas/i })).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: /Por horário/i }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: /Por sensor/i }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: /Rascunhos/i }),
		).toBeInTheDocument();

		expect(screen.getByText("10")).toBeInTheDocument();
		expect(screen.getByText("6")).toBeInTheDocument();
		expect(screen.getByText("4")).toBeInTheDocument();
		expect(screen.getByText("3")).toBeInTheDocument();
		expect(screen.getByText("5")).toBeInTheDocument();
		expect(screen.getByText("2")).toBeInTheDocument();
	});

	it("AutomationFilterChips_ClickChip_ShouldCallOnFilterChange", async () => {
		// Arrange
		const onFilterChange = vi.fn();
		const user = userEvent.setup();
		renderWithProviders(
			<AutomationFilterChips
				filter="all"
				onFilterChange={onFilterChange}
				counts={mockCounts}
			/>,
		);

		// Act
		await user.click(screen.getByRole("button", { name: /Por horário/i }));

		// Assert
		expect(onFilterChange).toHaveBeenCalledWith("schedule");
	});

	it("AutomationFilterChips_ActiveChip_ShouldRenderWithHighlightClasses", () => {
		// Act
		renderWithProviders(
			<AutomationFilterChips
				filter="sensor"
				onFilterChange={vi.fn()}
				counts={mockCounts}
			/>,
		);

		// Assert
		expect(screen.getByRole("button", { name: /Por sensor/i })).toHaveClass(
			"border-border",
			"bg-surface-high",
		);
		expect(screen.getByRole("button", { name: /Todas/i })).toHaveClass(
			"border-border-subtle",
			"bg-surface-container",
		);
	});
});
