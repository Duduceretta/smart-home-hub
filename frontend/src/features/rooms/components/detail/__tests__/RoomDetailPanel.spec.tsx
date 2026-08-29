import { HttpResponse, http } from "msw";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import { useRoomsUIStore } from "@/features/rooms/store/rooms-ui.store";
import {
	createRoomMock,
	createRoomPickerDeviceMock,
} from "@/testing/mocks/rooms.mock";
import { server } from "@/testing/mocks/server";
import { renderWithProviders, screen, userEvent } from "@/testing/test-utils";
import { RoomDetailPanel } from "../RoomDetailPanel";

function renderPanel(
	room: ReturnType<typeof createRoomMock> | null,
	devices: ReturnType<typeof createRoomPickerDeviceMock>[],
) {
	return renderWithProviders(
		<MemoryRouter>
			<RoomDetailPanel room={room} devices={devices} />
		</MemoryRouter>,
	);
}

function mockAllDetailSections() {
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
}

describe("RoomDetailPanel Integration Tests", () => {
	beforeEach(() => {
		useRoomsUIStore.setState({ editingRoom: null, isCreateDialogOpen: false });
	});

	it("RoomDetailPanel_NoRoomSelected_ShouldRenderSelectPrompt", () => {
		// Act
		renderPanel(null, []);

		// Assert
		expect(
			screen.getByText("Selecione um ambiente pra ver os detalhes."),
		).toBeInTheDocument();
	});

	it("RoomDetailPanel_RoomSelected_ShouldRenderNameAndDeviceCount", () => {
		// Arrange
		mockAllDetailSections();
		const room = createRoomMock({ name: "Quarto" });
		const devices = [
			createRoomPickerDeviceMock(),
			createRoomPickerDeviceMock({ id: "d2" }),
		];

		// Act
		renderPanel(room, devices);

		// Assert
		expect(screen.getByRole("heading", { name: "Quarto" })).toBeInTheDocument();
		expect(screen.getByText("2 dispositivos conectados")).toBeInTheDocument();
	});

	it("RoomDetailPanel_ClickEdit_ShouldOpenEditDialogForThisRoom", async () => {
		// Arrange
		mockAllDetailSections();
		const room = createRoomMock();
		const user = userEvent.setup();

		// Act
		renderPanel(room, []);
		await user.click(screen.getByRole("button", { name: "Editar" }));

		// Assert
		expect(useRoomsUIStore.getState().editingRoom).toEqual(room);
	});
});
