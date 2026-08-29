import { describe, expect, it } from "vitest";
import {
	createRoomMock,
	createRoomPickerDeviceMock,
} from "@/testing/mocks/rooms.mock";
import { renderWithProviders, screen } from "@/testing/test-utils";
import { RoomsSummaryBar } from "../RoomsSummaryBar";

describe("RoomsSummaryBar Integration Tests", () => {
	it("RoomsSummaryBar_SingleRoomAndDevice_ShouldUseSingularWording", () => {
		// Arrange
		const rooms = [createRoomMock()];
		const devices = [createRoomPickerDeviceMock({ roomId: "room-test-01" })];

		// Act
		renderWithProviders(<RoomsSummaryBar rooms={rooms} devices={devices} />);

		// Assert
		expect(screen.getByText("ambiente")).toBeInTheDocument();
		expect(screen.getByText("dispositivo")).toBeInTheDocument();
	});

	it("RoomsSummaryBar_MultipleRoomsAndDevices_ShouldUsePluralWording", () => {
		// Arrange
		const rooms = [
			createRoomMock({ id: "room-1" }),
			createRoomMock({ id: "room-2" }),
		];
		const devices = [
			createRoomPickerDeviceMock({ id: "device-1", roomId: "room-1" }),
			createRoomPickerDeviceMock({ id: "device-2", roomId: "room-2" }),
		];

		// Act
		renderWithProviders(<RoomsSummaryBar rooms={rooms} devices={devices} />);

		// Assert
		expect(screen.getByText("ambientes")).toBeInTheDocument();
		expect(screen.getByText("dispositivos")).toBeInTheDocument();
	});

	it("RoomsSummaryBar_DevicesWithoutRoomId_ShouldBeExcludedFromDeviceCount", () => {
		// Arrange — 2 ambientes (distinto de 1 dispositivo atribuído) pra não
		// colidir com o texto do contador de ambientes.
		const rooms = [
			createRoomMock({ id: "room-1" }),
			createRoomMock({ id: "room-2" }),
		];
		const devices = [
			createRoomPickerDeviceMock({ id: "device-1", roomId: "room-1" }),
			createRoomPickerDeviceMock({ id: "device-2", roomId: null }),
		];

		// Act
		renderWithProviders(<RoomsSummaryBar rooms={rooms} devices={devices} />);

		// Assert — só 1 dos 2 dispositivos tem roomId atribuído
		expect(screen.getByText("1")).toBeInTheDocument();
		expect(screen.getByText("dispositivo")).toBeInTheDocument();
	});

	it("RoomsSummaryBar_NoOfflineDevices_ShouldRenderOfflineCountWithoutDestructiveColor", () => {
		// Arrange
		const rooms = [createRoomMock()];
		const devices = [
			createRoomPickerDeviceMock({ roomId: "room-test-01", isOnline: true }),
		];

		// Act
		renderWithProviders(<RoomsSummaryBar rooms={rooms} devices={devices} />);
		const offlineValue = screen.getByText("0");

		// Assert
		expect(offlineValue.className).not.toContain("text-destructive");
	});

	it("RoomsSummaryBar_HasOfflineDevices_ShouldHighlightOfflineCountWithDestructiveColor", () => {
		// Arrange — 2 ambientes/2 dispositivos (distinto de 1 offline) pra não
		// colidir com os outros contadores da mesma faixa.
		const rooms = [
			createRoomMock({ id: "room-1" }),
			createRoomMock({ id: "room-2" }),
		];
		const devices = [
			createRoomPickerDeviceMock({
				id: "device-online",
				roomId: "room-1",
				isOnline: true,
			}),
			createRoomPickerDeviceMock({
				id: "device-offline",
				roomId: "room-2",
				isOnline: false,
			}),
		];

		// Act
		renderWithProviders(<RoomsSummaryBar rooms={rooms} devices={devices} />);
		const offlineValue = screen.getByText("1");

		// Assert
		expect(offlineValue.className).toContain("text-destructive");
		expect(screen.getByText("offline")).toBeInTheDocument();
	});
});
