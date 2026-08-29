import { HttpResponse, http } from "msw";
import { beforeEach, describe, expect, it } from "vitest";
import { useRoomsUIStore } from "@/features/rooms/store/rooms-ui.store";
import {
	createRoomMock,
	createRoomPickerDeviceMock,
} from "@/testing/mocks/rooms.mock";
import { server } from "@/testing/mocks/server";
import {
	renderWithProviders,
	screen,
	userEvent,
	waitFor,
} from "@/testing/test-utils";
import { RoomDeviceGrid } from "../RoomDeviceGrid";

describe("RoomDeviceGrid Integration Tests", () => {
	beforeEach(() => {
		useRoomsUIStore.setState({
			isCreateDialogOpen: false,
			editingRoom: null,
			editDialogFocusDevices: false,
		});
	});

	it("RoomDeviceGrid_NoDevices_ShouldRenderEmptyState", () => {
		// Act
		renderWithProviders(
			<RoomDeviceGrid room={createRoomMock()} devices={[]} />,
		);

		// Assert
		expect(
			screen.getByText("Nenhum dispositivo neste ambiente ainda."),
		).toBeInTheDocument();
	});

	it("RoomDeviceGrid_DevicesPresent_ShouldRenderEachDeviceCard", () => {
		// Arrange
		const devices = [
			createRoomPickerDeviceMock({ id: "d1", name: "Lâmpada Sala" }),
			createRoomPickerDeviceMock({ id: "d2", name: "Tomada Cozinha" }),
		];

		// Act
		renderWithProviders(
			<RoomDeviceGrid room={createRoomMock()} devices={devices} />,
		);

		// Assert
		expect(screen.getByText("Lâmpada Sala")).toBeInTheDocument();
		expect(screen.getByText("Tomada Cozinha")).toBeInTheDocument();
	});

	it("RoomDeviceGrid_ClickAddDevice_ShouldOpenEditDialogFocusedOnDevices", async () => {
		// Arrange
		const user = userEvent.setup();
		const room = createRoomMock();

		// Act
		renderWithProviders(<RoomDeviceGrid room={room} devices={[]} />);
		await user.click(
			screen.getByRole("button", {
				name: "Adicionar Dispositivo a este Ambiente",
			}),
		);

		// Assert
		const state = useRoomsUIStore.getState();
		expect(state.editingRoom).toEqual(room);
		expect(state.editDialogFocusDevices).toBe(true);
	});

	it("RoomDeviceGrid_ClickDeviceSwitch_ShouldSendToggleRequest", async () => {
		// Arrange
		let toggledDeviceId: string | null = null;
		server.use(
			http.post("*/api/devices/:id/toggle", ({ params }) => {
				toggledDeviceId = params.id as string;
				return HttpResponse.json({ message: "ok" });
			}),
		);
		const user = userEvent.setup();
		const devices = [
			createRoomPickerDeviceMock({ id: "device-toggle", type: 1, isOn: false }),
		];

		// Act
		renderWithProviders(
			<RoomDeviceGrid room={createRoomMock()} devices={devices} />,
		);
		await user.click(screen.getByRole("switch"));

		// Assert
		await waitFor(() => expect(toggledDeviceId).toBe("device-toggle"));
	});
});
