import { delay, HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";
import { createDashboardOverviewMock } from "@/testing/mocks/dashboard.mock";
import { server } from "@/testing/mocks/server";
import { renderWithProviders, screen } from "@/testing/test-utils";
import { StatusHubSummary } from "../StatusHubSummary";

describe("StatusHubSummary Integration Tests", () => {
	it("StatusHubSummary_WhileFetching_ShouldRenderSkeletonPlaceholders", async () => {
		// Arrange
		server.use(
			http.get("*/api/dashboard/overview", async () => {
				await delay(50);
				return HttpResponse.json(createDashboardOverviewMock());
			}),
		);

		// Act
		const { container } = renderWithProviders(<StatusHubSummary />);

		// Assert
		expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
		expect(await screen.findByText("130")).toBeInTheDocument();
		expect(container.querySelector(".animate-pulse")).not.toBeInTheDocument();
	});

	it("StatusHubSummary_OverviewLoaded_ShouldRenderFormattedMetrics", async () => {
		// Arrange
		server.use(
			http.get("*/api/dashboard/overview", () =>
				HttpResponse.json(
					createDashboardOverviewMock({
						summary: {
							totalDevicesCount: 5,
							onlineDevicesCount: 4,
							energyConsumptionKwh: 0.13,
							isEnergyEstimated: false,
							averageTemperatureCelsius: 23.4,
							temperatureTrend: 1.2,
							activeAlertsCount: 2,
						},
					}),
				),
			),
		);

		// Act
		renderWithProviders(<StatusHubSummary />);

		// Assert
		expect(await screen.findByText("130")).toBeInTheDocument();
		expect(screen.getByText("Wh")).toBeInTheDocument();
		expect(screen.getByText("4")).toBeInTheDocument();
		expect(screen.getByText("/ 5 ativos")).toBeInTheDocument();
		expect(screen.getByText("23°C")).toBeInTheDocument();
		expect(screen.getByText("+1.2°C")).toBeInTheDocument();
		expect(screen.getByText("2")).toBeInTheDocument();
	});

	it("StatusHubSummary_EnergyEstimated_ShouldPrefixValueWithTildeAndShowHint", async () => {
		// Arrange
		server.use(
			http.get("*/api/dashboard/overview", () =>
				HttpResponse.json(
					createDashboardOverviewMock({
						summary: {
							totalDevicesCount: 5,
							onlineDevicesCount: 4,
							energyConsumptionKwh: 0.13,
							isEnergyEstimated: true,
							averageTemperatureCelsius: 23,
							temperatureTrend: 0,
							activeAlertsCount: 0,
						},
					}),
				),
			),
		);

		// Act
		renderWithProviders(<StatusHubSummary />);

		// Assert
		expect(await screen.findByText("~130")).toBeInTheDocument();
		expect(
			screen.getByText(/acumulado hoje · inclui estimativa/i),
		).toBeInTheDocument();
	});
});
