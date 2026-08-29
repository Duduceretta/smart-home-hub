import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";
import { createRoomClimateMock } from "@/testing/mocks/rooms.mock";
import { server } from "@/testing/mocks/server";
import {
	renderWithProviders,
	screen,
	userEvent,
	waitFor,
} from "@/testing/test-utils";
import { RoomClimateSection } from "../RoomClimateSection";

describe("RoomClimateSection Integration Tests", () => {
	it("RoomClimateSection_HasClimateSensor_ShouldRenderTemperatureAndHumidityKpis", async () => {
		// Arrange
		server.use(
			http.get("*/api/rooms/:id/climate", () =>
				HttpResponse.json(
					createRoomClimateMock({
						temperatureCelsius: 23,
						humidityPercent: 55,
					}),
				),
			),
		);

		// Act
		renderWithProviders(<RoomClimateSection roomId="room-01" />);

		// Assert
		expect(await screen.findByText("23°C")).toBeInTheDocument();
		expect(screen.getByText("55%")).toBeInTheDocument();
	});

	it("RoomClimateSection_HasNoClimateSensor_ShouldRenderNothing", async () => {
		// Arrange
		server.use(
			http.get("*/api/rooms/:id/climate", () =>
				HttpResponse.json(
					createRoomClimateMock({
						hasClimateSensor: false,
						temperatureCelsius: null,
						humidityPercent: null,
					}),
				),
			),
		);

		// Act
		const { container } = renderWithProviders(
			<RoomClimateSection roomId="room-01" />,
		);

		// Assert — componente retorna null quando hasClimateSensor=false, sem
		// espaço reservado; espera o skeleton de loading sumir e confirma que
		// nada do conteúdo de clima chegou a renderizar.
		await waitFor(() => expect(container.firstChild).toBeNull());
	});

	it("RoomClimateSection_MissingSensorReading_ShouldRenderNoSensorAsUnavailable", async () => {
		// Arrange — sensor existe mas só reporta temperatura, não umidade
		server.use(
			http.get("*/api/rooms/:id/climate", () =>
				HttpResponse.json(
					createRoomClimateMock({
						temperatureCelsius: 23,
						humidityPercent: null,
					}),
				),
			),
		);

		// Act
		renderWithProviders(<RoomClimateSection roomId="room-01" />);

		// Assert
		expect(await screen.findByText("23°C")).toBeInTheDocument();
		expect(screen.getByText("Sem sensor")).toBeInTheDocument();
	});

	it("RoomClimateSection_FetchFails_ShouldRenderErrorStateAndRetryOnClick", async () => {
		// Arrange
		let requestCount = 0;
		server.use(
			http.get("*/api/rooms/:id/climate", () => {
				requestCount += 1;
				return HttpResponse.json(
					{ title: "Erro Interno do Servidor" },
					{ status: 500 },
				);
			}),
		);
		const user = userEvent.setup();

		// Act
		renderWithProviders(<RoomClimateSection roomId="room-01" />);

		// Assert
		expect(
			await screen.findByText(
				"Não foi possível carregar o clima do ambiente.",
				{},
				{ timeout: 3000 },
			),
		).toBeInTheDocument();
		const requestsBeforeRetry = requestCount;

		await user.click(screen.getByRole("button", { name: "Tentar de novo" }));

		expect(requestCount).toBeGreaterThan(requestsBeforeRetry);
	});
});
