import { describe, expect, it } from "vitest";
import { renderWithProviders } from "@/testing/test-utils";
import { NexusHubMonogram } from "../NexusHubMonogram";

describe("NexusHubMonogram Unit Tests", () => {
	it("NexusHubMonogram_BareVariant_ShouldRenderAccessibleSvgWithCorrectViewBox", () => {
		// Arrange & Act
		const { container } = renderWithProviders(<NexusHubMonogram />);

		// Assert
		const svg = container.querySelector("svg");
		expect(svg).toBeInTheDocument();
		expect(svg).toHaveAttribute("role", "img");
		expect(svg).toHaveAttribute("aria-label", "Nexus Hub");
		expect(svg).toHaveAttribute("viewBox", "0 0 1356 710");

		const paths = svg?.querySelectorAll("path");
		expect(paths).toHaveLength(2);
		expect(paths?.[0]).toHaveAttribute("fill", "var(--brand-accent)");
		expect(paths?.[1]).toHaveAttribute("fill", "var(--brand-muted)");
	});

	it("NexusHubMonogram_TileVariant_ShouldRenderRoundedContainer", () => {
		// Arrange & Act
		const { container } = renderWithProviders(
			<NexusHubMonogram variant="tile" />,
		);

		// Assert
		const svg = container.querySelector("svg");
		expect(svg).toBeInTheDocument();
		expect(svg).toHaveAttribute("role", "img");
		expect(svg).toHaveAttribute("aria-label", "Nexus Hub");
		expect(svg).toHaveAttribute("viewBox", "0 0 32 32");

		const rect = svg?.querySelector("rect");
		expect(rect).toBeInTheDocument();
		expect(rect).toHaveAttribute("width", "32");
		expect(rect).toHaveAttribute("height", "32");
		expect(rect).toHaveAttribute("rx", "7.5");

		const paths = svg?.querySelectorAll("path");
		expect(paths).toHaveLength(2);
	});

	it("NexusHubMonogram_CustomProps_ShouldMergeClassNameAndAttributes", () => {
		// Arrange & Act
		const { container } = renderWithProviders(
			<NexusHubMonogram
				className="h-10 w-10 text-custom"
				data-testid="nexus-monogram"
			/>,
		);

		// Assert
		const svg = container.querySelector("svg");
		expect(svg).toHaveClass("h-10");
		expect(svg).toHaveClass("w-10");
		expect(svg).toHaveAttribute("data-testid", "nexus-monogram");
	});
});
