import { delay, HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";
import { createDashboardOverviewMock } from "@/testing/mocks/dashboard.mock";
import { server } from "@/testing/mocks/server";
import { renderWithProviders, screen, userEvent } from "@/testing/test-utils";
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

	it("StatusHubSummary_FetchFails_ShouldPreserveGridAndRetryOnClick", async () => {
		// Arrange — erro LOCAL (só esta query falha) preserva o grid de 4
		// células do skeleton em vez de colapsar pra uma caixa única
		// centralizada; a mensagem completa vai em `aria-label` de cada
		// célula (role="alert"), não como texto solto repetido 4x.
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
		const { container } = renderWithProviders(<StatusHubSummary />);

		// Assert — estado de erro aparece após esgotar o retry automático,
		// preservando o mesmo grid de 4 células do skeleton/estado carregado
		const alerts = await screen.findAllByRole(
			"alert",
			{ name: /não foi possível carregar os indicadores/i },
			{ timeout: 3000 },
		);
		expect(alerts).toHaveLength(4);
		for (const alert of alerts) {
			expect(alert).toHaveClass("h-24");
			expect(alert).toHaveClass("border-dashed");
			expect(alert.className).not.toMatch(/destructive/);
		}
		const grid = container.querySelector(".grid");
		expect(grid).toHaveClass("lg:grid-cols-4");

		const requestsBeforeRetryClick = requestCount;
		const retryButtons = screen.getAllByRole("button", {
			name: /tentar novamente/i,
		});
		expect(retryButtons).toHaveLength(4);

		// Act
		await user.click(retryButtons[0]);

		// Assert — retry dispara refetch e, quando falha de novo, mantém o mesmo grid
		await screen.findAllByRole(
			"alert",
			{ name: /não foi possível carregar os indicadores/i },
			{ timeout: 3000 },
		);
		expect(requestCount).toBeGreaterThan(requestsBeforeRetryClick);
	});

	it("StatusHubSummary_RetrySucceeds_ShouldRestoreNormalContent", async () => {
		// Arrange — useDashboardOverview tem `retry: 1`, então falha nas 2
		// primeiras chamadas (a inicial + o retry automático do próprio
		// TanStack Query) e só sucede a partir da 3ª (o clique manual).
		let requestCount = 0;
		server.use(
			http.get("*/api/dashboard/overview", () => {
				requestCount += 1;
				return requestCount <= 2
					? HttpResponse.json(
							{ title: "Erro Interno do Servidor", status: 500 },
							{ status: 500 },
						)
					: HttpResponse.json(createDashboardOverviewMock());
			}),
		);
		const user = userEvent.setup();
		renderWithProviders(<StatusHubSummary />);

		await screen.findAllByRole(
			"alert",
			{ name: /não foi possível carregar os indicadores/i },
			{ timeout: 3000 },
		);
		const [retryButton] = screen.getAllByRole("button", {
			name: /tentar novamente/i,
		});

		// Act
		await user.click(retryButton);

		// Assert — conteúdo normal volta, sem sobrar nenhum alerta
		expect(await screen.findByText("130")).toBeInTheDocument();
		expect(screen.queryByRole("alert")).not.toBeInTheDocument();
	});
});
