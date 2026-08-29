import { HttpResponse, http } from "msw";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import {
	createRoomMock,
	createRoomPickerDeviceMock,
} from "@/testing/mocks/rooms.mock";
import { server } from "@/testing/mocks/server";
import { renderWithProviders, screen } from "@/testing/test-utils";
import { RoomDetailContent } from "../RoomDetailContent";

describe("RoomDetailContent Integration Tests", () => {
	it("RoomDetailContent_Rendered_ShouldComposeAllDetailSections", async () => {
		// Arrange — cada seção busca seu próprio dado; mocka todas com resposta
		// vazia/inofensiva só pra confirmar que a composição renderiza sem erro
		// e repassa room/devices pros filhos certos (grid de dispositivos e
		// ações rápidas usam props diretas, sem fetch).
		server.use(
			http.get("*/api/rooms/:id/climate", () =>
				HttpResponse.json({
					hasClimateSensor: false,
					temperatureCelsius: null,
					humidityPercent: null,
					readingTimestampUtc: null,
				}),
			),
			http.get("*/api/rooms/:id/energy", () =>
				HttpResponse.json({
					hasEnergyData: false,
					chart: [],
					totalConsumptionKwh: 0,
					isEnergyEstimated: false,
				}),
			),
			http.get("*/api/rooms/:id/automations", () => HttpResponse.json([])),
			http.get("*/api/rooms/:id/events", () =>
				HttpResponse.json({ items: [], page: 1, pageSize: 8, totalCount: 0 }),
			),
		);
		const room = createRoomMock();
		const devices = [createRoomPickerDeviceMock({ name: "Lâmpada Sala" })];

		// Act
		renderWithProviders(
			<MemoryRouter>
				<RoomDetailContent room={room} devices={devices} />
			</MemoryRouter>,
		);

		// Assert — RoomQuickActions e RoomDeviceGrid recebem devices via props
		expect(screen.getByText("Ligar Tudo")).toBeInTheDocument();
		expect(screen.getByText("Lâmpada Sala")).toBeInTheDocument();
		expect(
			await screen.findByText("Nenhuma atividade recente."),
		).toBeInTheDocument();
	});
});
