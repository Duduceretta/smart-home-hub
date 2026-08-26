import { describe, expect, it } from "vitest";
import { renderWithProviders, screen } from "@/testing/test-utils";
import { DashboardTopBar } from "../DashboardTopBar";

describe("DashboardTopBar Integration Tests", () => {
	it("DashboardTopBar_Rendered_ShouldShowTitleSubtitleAndHubStatus", () => {
		// Act
		renderWithProviders(<DashboardTopBar />);

		// Assert
		expect(screen.getByText("Visão Geral")).toBeInTheDocument();
		expect(
			screen.getByText("Monitoramento do ecossistema em tempo real"),
		).toBeInTheDocument();
		expect(screen.getByText("Hub Online")).toBeInTheDocument();
		expect(screen.getByText("TEMPO REAL")).toBeInTheDocument();
	});
});
