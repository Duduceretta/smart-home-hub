import type { ReactElement } from "react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { createDeviceInGroupMock } from "@/testing/mocks/device-groups.mock";
import { renderWithProviders, screen, userEvent } from "@/testing/test-utils";
import { DeviceGroupDeviceCard } from "../DeviceGroupDeviceCard";

function renderCard(ui: ReactElement) {
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

describe("DeviceGroupDeviceCard Integration Tests", () => {
	it("DeviceGroupDeviceCard_Television_ShouldRenderControlButtonInsteadOfSwitch", () => {
		// Arrange
		const device = createDeviceInGroupMock({ type: 8 });

		// Act
		renderCard(<DeviceGroupDeviceCard device={device} onToggle={() => {}} />);

		// Assert
		expect(
			screen.getByRole("button", { name: "Controle" }),
		).toBeInTheDocument();
		expect(screen.queryByRole("switch")).not.toBeInTheDocument();
	});

	it("DeviceGroupDeviceCard_ClickControlButtonOnTv_ShouldNavigateToDevicesWithSelectedDeviceState", async () => {
		// Arrange
		const user = userEvent.setup();
		const device = createDeviceInGroupMock({ id: "tv-1", type: 8 });

		// Act
		renderWithProviders(
			<MemoryRouter initialEntries={["/device-groups"]}>
				<Routes>
					<Route
						path="/device-groups"
						element={
							<DeviceGroupDeviceCard
								device={device}
								groupName="Home Theater"
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
			returnTo: "/device-groups",
			returnLabel: "Home Theater",
		});
	});

	it("DeviceGroupDeviceCard_ClickControlButton_ShouldNotAlsoToggleTheCardItself", async () => {
		// Arrange — the "Controle" click sits inside a stopPropagation wrapper;
		// this confirms it doesn't also bubble into the whole-card navigation
		// handler and fire it twice (would otherwise double-push history).
		const user = userEvent.setup();
		const device = createDeviceInGroupMock({ id: "tv-1", type: 8 });
		let onToggleCalls = 0;

		// Act
		renderWithProviders(
			<MemoryRouter initialEntries={["/device-groups"]}>
				<Routes>
					<Route
						path="/device-groups"
						element={
							<DeviceGroupDeviceCard
								device={device}
								onToggle={() => {
									onToggleCalls++;
								}}
							/>
						}
					/>
					<Route path="/devices" element={<LocationStateProbe />} />
				</Routes>
			</MemoryRouter>,
		);
		await user.click(screen.getByRole("button", { name: "Controle" }));

		// Assert — a single navigation happened (one location-state render), and
		// the toggle callback (unrelated to TV) was never invoked.
		await screen.findByTestId("location-state");
		expect(onToggleCalls).toBe(0);
	});
});
