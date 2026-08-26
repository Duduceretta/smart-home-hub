import { describe, expect, it } from "vitest";
import { renderWithProviders, screen } from "@/testing/test-utils";
import { CameraFeedCard } from "../CameraFeedCard";

describe("CameraFeedCard Integration Tests", () => {
	it("CameraFeedCard_Rendered_ShouldShowLiveBadgeAndComingSoonNotice", () => {
		// Act
		renderWithProviders(<CameraFeedCard />);

		// Assert
		expect(screen.getByText("Aether Secure")).toBeInTheDocument();
		expect(screen.getByText("LIVE")).toBeInTheDocument();
		expect(
			screen.getByText("Integração de câmeras chegando em breve."),
		).toBeInTheDocument();
	});
});
