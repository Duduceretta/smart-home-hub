import type { ReactElement } from "react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { createRoomPickerDeviceMock } from "@/testing/mocks/rooms.mock";
import { renderWithProviders, screen, userEvent } from "@/testing/test-utils";
import { RoomDeviceCard } from "../RoomDeviceCard";

function renderRoomDeviceCard(ui: ReactElement) {
	return renderWithProviders(<MemoryRouter>{ui}</MemoryRouter>);
}

/** Renders `location.state` as text so tests can assert on the navigation
 * outcome the same way a user/DOM would observe it, instead of mocking
 * `useNavigate`. */
function LocationStateProbe() {
	const location = useLocation();
	return (
		<pre data-testid="location-state">{JSON.stringify(location.state)}</pre>
	);
}

describe("RoomDeviceCard Integration Tests", () => {
	it("RoomDeviceCard_DeviceOffline_ShouldRenderOfflineBadgeInsteadOfSwitch", () => {
		// Arrange
		const device = createRoomPickerDeviceMock({ isOnline: false });

		// Act
		renderRoomDeviceCard(
			<RoomDeviceCard device={device} onToggle={() => {}} />,
		);

		// Assert
		expect(screen.getByText("Offline")).toBeInTheDocument();
		expect(screen.queryByRole("switch")).not.toBeInTheDocument();
	});

	it("RoomDeviceCard_ActuatorOn_ShouldRenderCheckedSwitchAndOnLabel", () => {
		// Arrange
		const device = createRoomPickerDeviceMock({ type: 1, isOn: true });

		// Act
		renderRoomDeviceCard(
			<RoomDeviceCard device={device} onToggle={() => {}} />,
		);

		// Assert
		expect(screen.getByText("Ligado")).toBeInTheDocument();
		expect(screen.getByRole("switch")).toBeChecked();
	});

	it("RoomDeviceCard_ActuatorOff_ShouldRenderUncheckedSwitchAndOffLabel", () => {
		// Arrange
		const device = createRoomPickerDeviceMock({ type: 1, isOn: false });

		// Act
		renderRoomDeviceCard(
			<RoomDeviceCard device={device} onToggle={() => {}} />,
		);

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
		renderRoomDeviceCard(
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
		renderRoomDeviceCard(
			<RoomDeviceCard device={device} isToggling onToggle={() => {}} />,
		);

		// Assert
		expect(screen.queryByRole("switch")).not.toBeInTheDocument();
	});

	it("RoomDeviceCard_Television_ShouldRenderControlButtonInsteadOfSwitch", () => {
		// Arrange
		const device = createRoomPickerDeviceMock({ type: 8 });

		// Act
		renderRoomDeviceCard(
			<RoomDeviceCard device={device} onToggle={() => {}} />,
		);

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
		renderRoomDeviceCard(
			<RoomDeviceCard device={device} onToggle={() => {}} />,
		);

		// Assert
		expect(screen.getByText("Online")).toBeInTheDocument();
		expect(screen.queryByRole("switch")).not.toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: "Controle" }),
		).not.toBeInTheDocument();
	});

	it("RoomDeviceCard_ClickControlButtonOnTv_ShouldNavigateToDevicesWithSelectedDeviceState", async () => {
		// Arrange — mirrors DeviceGroupDeviceCard's existing navigation
		// mechanism: location.state.selectedDeviceId, read by DevicesView to
		// open the TV's detail panel (TvControlPanel) directly.
		const user = userEvent.setup();
		const device = createRoomPickerDeviceMock({ id: "tv-1", type: 8 });

		// Act
		renderWithProviders(
			<MemoryRouter initialEntries={["/rooms"]}>
				<Routes>
					<Route
						path="/rooms"
						element={
							<RoomDeviceCard
								device={device}
								roomName="Sala de Estar"
								onToggle={() => {}}
							/>
						}
					/>
					<Route path="/devices" element={<LocationStateProbe />} />
				</Routes>
			</MemoryRouter>,
		);
		await user.click(screen.getByRole("button", { name: "Controle" }));

		// Assert
		const stateText = await screen.findByTestId("location-state");
		expect(JSON.parse(stateText.textContent as string)).toEqual({
			selectedDeviceId: "tv-1",
			returnTo: "/rooms",
			returnLabel: "Sala de Estar",
		});
	});
});
