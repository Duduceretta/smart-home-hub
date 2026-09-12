import { describe, expect, it } from "vitest";
import { renderWithProviders } from "@/testing/test-utils";
import { NexusHubWordmark } from "../NexusHubWordmark";

describe("NexusHubWordmark Unit Tests", () => {
	it("NexusHubWordmark_DefaultRender_ShouldHaveAccessibleRoleAndDefaultColors", () => {
		// Arrange & Act
		const { container } = renderWithProviders(<NexusHubWordmark />);

		// Assert
		const svg = container.querySelector("svg");
		expect(svg).toBeInTheDocument();
		expect(svg).toHaveAttribute("role", "img");
		expect(svg).toHaveAttribute("aria-label", "Nexus Hub");
		expect(svg).toHaveAttribute("viewBox", "0 0 4754 730");

		// N path should use brand-accent
		const paths = svg?.querySelectorAll("path");
		expect(paths).toBeDefined();
		expect(paths?.[0]).toHaveAttribute("fill", "var(--brand-accent)");

		// Remaining letter paths should use currentColor
		for (let i = 1; i < (paths?.length ?? 0); i++) {
			expect(paths?.[i]).toHaveAttribute("fill", "currentColor");
		}

		// Network mesh group should exist with lines and circles
		const networkGroup = svg?.querySelector("g");
		expect(networkGroup).toBeInTheDocument();
		const lines = networkGroup?.querySelectorAll("line");
		expect(lines).toHaveLength(2);
		const circles = networkGroup?.querySelectorAll("circle");
		expect(circles).toHaveLength(5);
	});

	it("NexusHubWordmark_ColorOverrides_ShouldUseCustomAccentAndTextColor", () => {
		// Arrange & Act
		const { container } = renderWithProviders(
			<NexusHubWordmark
				accentColor="rgb(255, 0, 0)"
				textColor="rgb(0, 255, 0)"
			/>,
		);

		// Assert
		const svg = container.querySelector("svg");
		const paths = svg?.querySelectorAll("path");
		expect(paths?.[0]).toHaveAttribute("fill", "rgb(255, 0, 0)");
		expect(paths?.[1]).toHaveAttribute("fill", "rgb(0, 255, 0)");

		const lines = svg?.querySelectorAll("line");
		expect(lines?.[0]).toHaveAttribute("stroke", "rgb(255, 0, 0)");

		const circles = svg?.querySelectorAll("circle");
		expect(circles?.[0]).toHaveAttribute("fill", "rgb(255, 0, 0)");
	});

	it("NexusHubWordmark_CustomClassName_ShouldMergeProperly", () => {
		// Arrange & Act
		const { container } = renderWithProviders(
			<NexusHubWordmark
				className="h-8 w-auto text-primary"
				data-testid="nexus-wordmark"
			/>,
		);

		// Assert
		const svg = container.querySelector("svg");
		expect(svg).toHaveClass("h-8");
		expect(svg).toHaveClass("w-auto");
		expect(svg).toHaveClass("text-primary");
		expect(svg).toHaveAttribute("data-testid", "nexus-wordmark");
	});
});
