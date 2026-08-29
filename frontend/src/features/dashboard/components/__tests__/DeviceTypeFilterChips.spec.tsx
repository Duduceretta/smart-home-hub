import { describe, expect, it, vi } from "vitest";
import { renderWithProviders, screen, userEvent } from "@/testing/test-utils";
import { DeviceTypeFilterChips } from "../DeviceTypeFilterChips";

describe("DeviceTypeFilterChips Integration Tests", () => {
	it("DeviceTypeFilterChips_Rendered_ShouldShowEachChipWithItsCount", () => {
		// Act
		renderWithProviders(
			<DeviceTypeFilterChips
				activeChip="all"
				onChange={vi.fn()}
				countsByChip={{ all: 5, lights: 2, climate: 1, media: 0 }}
			/>,
		);

		// Assert — label e contagem são <span>s separados dentro do botão, não
		// um texto único "LABEL (n)".
		expect(screen.getByRole("button", { name: /TODOS/i })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /LUZES/i })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /CLIMA/i })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /MÍDIA/i })).toBeInTheDocument();

		expect(screen.getByText("5")).toBeInTheDocument();
		expect(screen.getByText("2")).toBeInTheDocument();
		expect(screen.getByText("1")).toBeInTheDocument();
		expect(screen.getByText("0")).toBeInTheDocument();
	});

	it("DeviceTypeFilterChips_ClickInactiveChip_ShouldCallOnChangeWithThatChipKey", async () => {
		// Arrange
		const onChange = vi.fn();
		const user = userEvent.setup();
		renderWithProviders(
			<DeviceTypeFilterChips
				activeChip="all"
				onChange={onChange}
				countsByChip={{ all: 5, lights: 2, climate: 1, media: 0 }}
			/>,
		);

		// Act
		await user.click(screen.getByRole("button", { name: /LUZES/i }));

		// Assert
		expect(onChange).toHaveBeenCalledWith("lights");
	});

	it("DeviceTypeFilterChips_ActiveChip_ShouldRenderWithHighlightBorderClass", () => {
		// Act
		renderWithProviders(
			<DeviceTypeFilterChips
				activeChip="climate"
				onChange={vi.fn()}
				countsByChip={{ all: 5, lights: 2, climate: 1, media: 0 }}
			/>,
		);

		// Assert — só o chip ativo carrega border-border/bg-surface-high, os
		// outros ficam com border-border-subtle/bg-surface-container.
		expect(screen.getByRole("button", { name: /CLIMA/i })).toHaveClass(
			"border-border",
			"bg-surface-high",
		);
		expect(screen.getByRole("button", { name: /TODOS/i })).toHaveClass(
			"border-border-subtle",
			"bg-surface-container",
		);
	});
});
