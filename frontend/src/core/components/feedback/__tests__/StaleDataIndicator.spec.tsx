import { describe, expect, it } from "vitest";
import { renderWithProviders } from "@/testing/test-utils";
import { StaleDataIndicator } from "../StaleDataIndicator";

describe("StaleDataIndicator Unit Tests", () => {
	it("StaleDataIndicator_Render_ShouldHaveAccessibleLabelAndWarmToken", () => {
		// Arrange & Act
		const { container } = renderWithProviders(<StaleDataIndicator />);

		// Assert
		const icon = container.querySelector("svg");
		expect(icon).toBeInTheDocument();
		expect(icon).toHaveClass("text-warm");
		expect(icon).toHaveAttribute(
			"aria-label",
			"Dados desatualizados — não foi possível atualizar agora.",
		);
		expect(icon).toHaveAttribute(
			"title",
			"Dados desatualizados — não foi possível atualizar agora.",
		);
	});

	it("StaleDataIndicator_CustomClassName_ShouldMergeWithDefaults", () => {
		// Arrange & Act
		const { container } = renderWithProviders(
			<StaleDataIndicator className="ml-2" />,
		);

		// Assert
		const icon = container.querySelector("svg");
		expect(icon).toHaveClass("ml-2");
		expect(icon).toHaveClass("text-warm");
	});
});
