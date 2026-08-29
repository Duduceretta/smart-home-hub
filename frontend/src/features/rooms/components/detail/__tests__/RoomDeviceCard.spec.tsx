import { describe, expect, it } from "vitest";
import { createRoomPickerDeviceMock } from "@/testing/mocks/rooms.mock";
import { renderWithProviders, screen, userEvent } from "@/testing/test-utils";
import { RoomDeviceCard } from "../RoomDeviceCard";

describe("RoomDeviceCard Integration Tests", () => {
	it("RoomDeviceCard_DeviceOffline_ShouldRenderOfflineBadgeInsteadOfSwitch", () => {
		// Arrange
		const device = createRoomPickerDeviceMock({ isOnline: false });

		// Act
		renderWithProviders(<RoomDeviceCard device={device} onToggle={() => {}} />);

		// Assert
		expect(screen.getByText("Offline")).toBeInTheDocument();
		expect(screen.queryByRole("switch")).not.toBeInTheDocument();
	});

	it("RoomDeviceCard_ActuatorOn_ShouldRenderCheckedSwitchAndOnLabel", () => {
		// Arrange
		const device = createRoomPickerDeviceMock({ type: 1, isOn: true });

		// Act
		renderWithProviders(<RoomDeviceCard device={device} onToggle={() => {}} />);

		// Assert
		expect(screen.getByText("Ligado")).toBeInTheDocument();
		expect(screen.getByRole("switch")).toBeChecked();
	});

	it("RoomDeviceCard_ActuatorOff_ShouldRenderUncheckedSwitchAndOffLabel", () => {
		// Arrange
		const device = createRoomPickerDeviceMock({ type: 1, isOn: false });

		// Act
		renderWithProviders(<RoomDeviceCard device={device} onToggle={() => {}} />);

		// Assert
		expect(screen.getByText("Desligado")).toBeInTheDocument();
		expect(screen.getByRole("switch")).not.toBeChecked();
	});

	it("RoomDeviceCard_ClickSwitch_ShouldCallOnToggleWithDeviceId", async () => {
		// Arrange
		const user = userEvent.setup();
		const device = createRoomPickerDeviceMock({ id: "device-99", type: 1 });
		let toggledId: string | null = null;

		// Act
		renderWithProviders(
			<RoomDeviceCard
				device={device}
				onToggle={(id) => {
					toggledId = id;
				}}
			/>,
		);
		await user.click(screen.getByRole("switch"));

		// Assert
		expect(toggledId).toBe("device-99");
	});

	it("RoomDeviceCard_Toggling_ShouldReplaceSwitchWithSpinner", () => {
		// Arrange
		const device = createRoomPickerDeviceMock({ type: 1 });

		// Act
		renderWithProviders(
			<RoomDeviceCard device={device} isToggling onToggle={() => {}} />,
		);

		// Assert
		expect(screen.queryByRole("switch")).not.toBeInTheDocument();
	});

	it("RoomDeviceCard_Television_ShouldRenderControlButtonInsteadOfSwitch", () => {
		// Arrange
		const device = createRoomPickerDeviceMock({ type: 8 });

		// Act
		renderWithProviders(<RoomDeviceCard device={device} onToggle={() => {}} />);

		// Assert
		expect(
			screen.getByRole("button", { name: "Controle" }),
		).toBeInTheDocument();
		expect(screen.queryByRole("switch")).not.toBeInTheDocument();
	});

	it("RoomDeviceCard_NonToggleableSensor_ShouldRenderOnlineWithoutSwitchOrButton", () => {
		// Arrange — tipo 3 (Sensor) não é atuador nem TV
		const device = createRoomPickerDeviceMock({ type: 3 });

		// Act
		renderWithProviders(<RoomDeviceCard device={device} onToggle={() => {}} />);

		// Assert
		expect(screen.getByText("Online")).toBeInTheDocument();
		expect(screen.queryByRole("switch")).not.toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: "Controle" }),
		).not.toBeInTheDocument();
	});
});
