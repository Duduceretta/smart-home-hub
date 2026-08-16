import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";
import { createDeviceMock } from "@/testing/mocks/device.mock";
import { server } from "@/testing/mocks/server";
import {
	renderWithProviders,
	screen,
	userEvent,
	waitFor,
} from "@/testing/test-utils";
import { DeviceCard } from "../DeviceCard";

describe("DeviceCard Integration Tests", () => {
	it("DeviceCard_DeviceOnline_ShouldRenderInfoAndActiveSwitch", () => {
		// Arrange
		const mockDevice = createDeviceMock({
			name: "Lâmpada da Sala",
			brand: "Philips Hue",
			room: "Sala de Estar",
			isOnline: true,
			isOn: false,
		});

		// Act
		renderWithProviders(<DeviceCard device={mockDevice} />);

		// Assert
		expect(screen.getByText("Lâmpada da Sala")).toBeInTheDocument();
		expect(screen.getByText(/Philips Hue/i)).toBeInTheDocument();
		expect(screen.getByText(/Sala de Estar/i)).toBeInTheDocument();
		expect(screen.getByRole("switch")).toBeEnabled();
	});

	it("DeviceCard_DeviceOffline_ShouldDisableSwitchInteraction", () => {
		// Arrange
		const mockDevice = createDeviceMock({
			name: "Sensor de Porta",
			isOnline: false,
		});

		// Act
		renderWithProviders(<DeviceCard device={mockDevice} />);

		// Assert
		const switchButton = screen.getByRole("switch");
		expect(switchButton).toBeDisabled();
	});

	it("DeviceCard_ClickToggleSwitch_ShouldCallApiAndToggleSuccessfully", async () => {
		// Arrange
		let postCalled = false;
		server.use(
			http.post("*/api/devices/:id/toggle", async ({ params }) => {
				if (params.id === "device-light-1") {
					postCalled = true;
				}
				return HttpResponse.json(
					{ id: "device-light-1", isOn: true },
					{ status: 200 },
				);
			}),
		);

		const user = userEvent.setup();
		const mockDevice = createDeviceMock({
			id: "device-light-1",
			isOn: false,
			isOnline: true,
		});
		renderWithProviders(<DeviceCard device={mockDevice} />);

		// Act
		const switchButton = screen.getByRole("switch");
		await user.click(switchButton);

		// Assert
		await waitFor(() => {
			expect(postCalled).toBe(true);
		});
	});
});
