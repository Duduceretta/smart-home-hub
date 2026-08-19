import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";
import { Toaster } from "@/core/components/ui/sonner";
import { createDeviceMock } from "@/testing/mocks/device.mock";
import { server } from "@/testing/mocks/server";
import {
	renderWithProviders,
	screen,
	userEvent,
	waitFor,
	within,
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
		expect(screen.queryByText(/^offline$/i)).not.toBeInTheDocument();
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
		expect(screen.getByText(/^offline$/i)).toBeInTheDocument();
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

	it("DeviceCard_ToggleServerError_ShouldDisplayErrorFeedbackAndReenableSwitch", async () => {
		// Arrange
		server.use(
			http.post("*/api/devices/:id/toggle", async () => {
				return HttpResponse.json(
					{
						title: "Erro Interno do Servidor",
						status: 500,
						detail: "Falha ao comunicar com o dispositivo IoT.",
					},
					{ status: 500 },
				);
			}),
		);

		const user = userEvent.setup();
		const mockDevice = createDeviceMock({
			id: "device-light-1",
			isOn: false,
			isOnline: true,
		});
		renderWithProviders(
			<>
				<DeviceCard device={mockDevice} />
				<Toaster />
			</>,
		);

		// Act
		const switchButton = screen.getByRole("switch");
		await user.click(switchButton);

		// Assert
		expect(
			await screen.findByText(/Falha ao comunicar com o dispositivo IoT\./i),
		).toBeInTheDocument();
		await waitFor(() => {
			expect(switchButton).toBeEnabled();
		});
	});

	it("DeviceCard_DeleteViaOptionsMenu_ShouldCallDeleteApiAndCloseConfirmationModal", async () => {
		// Arrange
		let deleteCalled = false;
		server.use(
			http.delete("*/api/devices/:id", async ({ params }) => {
				if (params.id === "device-light-1") {
					deleteCalled = true;
				}
				return new HttpResponse(null, { status: 204 });
			}),
		);

		const user = userEvent.setup();
		const mockDevice = createDeviceMock({
			id: "device-light-1",
			name: "Lâmpada da Sala",
		});
		renderWithProviders(<DeviceCard device={mockDevice} />);

		// Act
		await user.click(
			screen.getByRole("button", { name: /mais opções do dispositivo/i }),
		);
		await user.click(await screen.findByRole("menuitem", { name: /excluir/i }));

		const confirmDialog = await screen.findByRole("alertdialog");
		await user.click(
			within(confirmDialog).getByRole("button", { name: /^excluir$/i }),
		);

		// Assert
		await waitFor(() => {
			expect(deleteCalled).toBe(true);
		});
		await waitFor(() => {
			expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
		});
	});
});
