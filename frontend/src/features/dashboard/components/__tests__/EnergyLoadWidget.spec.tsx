import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";
import { createDashboardOverviewMock } from "@/testing/mocks/dashboard.mock";
import { server } from "@/testing/mocks/server";
import { renderWithProviders, screen, userEvent } from "@/testing/test-utils";
import { EnergyLoadWidget } from "../EnergyLoadWidget";

describe("EnergyLoadWidget Integration Tests", () => {
	it("EnergyLoadWidget_ChartHasNoPointsToday_ShouldRenderEmptyState", async () => {
		// Arrange
		server.use(
			http.get("*/api/dashboard/overview", () =>
				HttpResponse.json(createDashboardOverviewMock({ energyChart: [] })),
			),
		);

		// Act
		renderWithProviders(<EnergyLoadWidget />);

		// Assert
		expect(
			await screen.findByText(/nenhum consumo registrado hoje/i),
		).toBeInTheDocument();
	});

	it("EnergyLoadWidget_ChartHasPoints_ShouldHideEmptyStateAndShowTotalBadge", async () => {
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
							averageTemperatureCelsius: 23,
							temperatureTrend: 0,
							activeAlertsCount: 0,
						},
					}),
				),
			),
		);

		// Act
		renderWithProviders(<EnergyLoadWidget />);

		// Assert
		expect(await screen.findByText(/130 Wh/)).toBeInTheDocument();
		expect(
			screen.queryByText(/nenhum consumo registrado hoje/i),
		).not.toBeInTheDocument();
	});

	it("EnergyLoadWidget_EnergyEstimated_ShouldPrefixTotalBadgeWithTilde", async () => {
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
		renderWithProviders(<EnergyLoadWidget />);

		// Assert
		expect(await screen.findByText(/~130 Wh/)).toBeInTheDocument();
	});

	it("EnergyLoadWidget_FetchFails_ShouldRenderErrorStateAndRetryOnClick", async () => {
		// Arrange
		let requestCount = 0;
		server.use(
			http.get("*/api/dashboard/overview", () => {
				requestCount += 1;
				return HttpResponse.json(
					{ title: "Erro Interno do Servidor", status: 500 },
					{ status: 500 },
				);
			}),
		);

		const user = userEvent.setup();
		renderWithProviders(<EnergyLoadWidget />);

		// Assert — estado de erro aparece após esgotar o retry automático
		expect(
			await screen.findByText(
				/não foi possível carregar o gráfico de consumo/i,
				{},
				{ timeout: 3000 },
			),
		).toBeInTheDocument();
		const requestsBeforeRetryClick = requestCount;

		// Act
		await user.click(screen.getByRole("button", { name: /tentar novamente/i }));

		// Assert
		await screen.findByText(
			/não foi possível carregar o gráfico de consumo/i,
			{},
			{ timeout: 3000 },
		);
		expect(requestCount).toBeGreaterThan(requestsBeforeRetryClick);
	});
});
