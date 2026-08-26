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

		// Assert
		expect(screen.getByText("TODOS (5)")).toBeInTheDocument();
		expect(screen.getByText("LUZES (2)")).toBeInTheDocument();
		expect(screen.getByText("CLIMA (1)")).toBeInTheDocument();
		expect(screen.getByText("MÍDIA (0)")).toBeInTheDocument();
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
		await user.click(screen.getByText("LUZES (2)"));

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

		// Assert — só o chip ativo carrega border-primary, os outros ficam neutros
		expect(screen.getByText("CLIMA (1)")).toHaveClass("border-primary");
		expect(screen.getByText("TODOS (5)")).not.toHaveClass("border-primary");
	});
});
