import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";
import { createRoomEnergyMock } from "@/testing/mocks/rooms.mock";
import { server } from "@/testing/mocks/server";
import { renderWithProviders, screen, userEvent } from "@/testing/test-utils";
import { RoomEnergyChart } from "../RoomEnergyChart";

describe("RoomEnergyChart Integration Tests", () => {
	it("RoomEnergyChart_HasEnergyData_ShouldRenderTotalConsumptionBadge", async () => {
		// Arrange
		server.use(
			http.get("*/api/rooms/:id/energy", () =>
				HttpResponse.json(createRoomEnergyMock({ totalConsumptionKwh: 0.13 })),
			),
		);

		// Act
		renderWithProviders(<RoomEnergyChart roomId="room-01" />);

		// Assert
		expect(await screen.findByText(/130 Wh no período/)).toBeInTheDocument();
	});

	it("RoomEnergyChart_EnergyEstimated_ShouldPrefixBadgeWithTilde", async () => {
		// Arrange
		server.use(
			http.get("*/api/rooms/:id/energy", () =>
				HttpResponse.json(
					createRoomEnergyMock({
						totalConsumptionKwh: 0.13,
						isEnergyEstimated: true,
					}),
				),
			),
		);

		// Act
		renderWithProviders(<RoomEnergyChart roomId="room-01" />);

		// Assert
		expect(await screen.findByText(/~130 Wh no período/)).toBeInTheDocument();
	});

	it("RoomEnergyChart_NoDataInPeriod_ShouldRenderEmptyState", async () => {
		// Arrange
		server.use(
			http.get("*/api/rooms/:id/energy", () =>
				HttpResponse.json(
					createRoomEnergyMock({ hasEnergyData: false, chart: [] }),
				),
			),
		);

		// Act
		renderWithProviders(<RoomEnergyChart roomId="room-01" />);

		// Assert
		expect(
			await screen.findByText("Nenhum consumo registrado neste período."),
		).toBeInTheDocument();
	});

	it("RoomEnergyChart_ClickRange7d_ShouldRequestSevenDayRange", async () => {
		// Arrange
		let lastRange: string | null = null;
		server.use(
			http.get("*/api/rooms/:id/energy", ({ request }) => {
				lastRange = new URL(request.url).searchParams.get("range");
				return HttpResponse.json(createRoomEnergyMock());
			}),
		);
		const user = userEvent.setup();

		// Act
		renderWithProviders(<RoomEnergyChart roomId="room-01" />);
		await screen.findByText(/no período/);
		await user.click(screen.getByRole("button", { name: "7 dias" }));

		// Assert
		await screen.findByText(/no período/);
		expect(lastRange).toBe("7d");
	});

	it("RoomEnergyChart_FetchFails_ShouldRenderErrorStateAndRetryOnClick", async () => {
		// Arrange
		let requestCount = 0;
		server.use(
			http.get("*/api/rooms/:id/energy", () => {
				requestCount += 1;
				return HttpResponse.json(
					{ title: "Erro Interno do Servidor" },
					{ status: 500 },
				);
			}),
		);
		const user = userEvent.setup();

		// Act
		renderWithProviders(<RoomEnergyChart roomId="room-01" />);

		// Assert
		expect(
			await screen.findByText(
				"Não foi possível carregar o consumo de energia.",
				{},
				{ timeout: 3000 },
			),
		).toBeInTheDocument();
		const requestsBeforeRetry = requestCount;

		await user.click(screen.getByRole("button", { name: "Tentar de novo" }));

		expect(requestCount).toBeGreaterThan(requestsBeforeRetry);
	});

	it("RoomEnergyChart_BackgroundRefetchFailsWithCache_ShouldKeepChartAndShowStaleIndicator", async () => {
		// Arrange — 1ª carga bem-sucedida, popula o cache
		server.use(
			http.get("*/api/rooms/:id/energy", () =>
				HttpResponse.json(createRoomEnergyMock({ totalConsumptionKwh: 0.13 })),
			),
		);
		const { queryClient } = renderWithProviders(
			<RoomEnergyChart roomId="room-01" />,
		);
		await screen.findByText(/130 Wh no período/);

		// Act — refetch em background falha
		server.use(
			http.get("*/api/rooms/:id/energy", () =>
				HttpResponse.json({ title: "Erro" }, { status: 500 }),
			),
		);
		await queryClient.refetchQueries();

		// Assert — gráfico continua na tela, com indicador discreto no título
		expect(
			await screen.findByTitle(/dados desatualizados/i, {}, { timeout: 3000 }),
		).toBeInTheDocument();
		expect(screen.getByText(/130 Wh no período/)).toBeInTheDocument();
	});
});
