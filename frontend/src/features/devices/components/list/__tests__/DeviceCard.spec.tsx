import { HttpResponse, http } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Toaster } from "@/core/components/ui/sonner";
import {
	DeviceTypeEnum,
	IntegrationTypeEnum,
} from "@/features/devices/types/devices.types";
import { createDeviceMock } from "@/testing/mocks/device.mock";
import { server } from "@/testing/mocks/server";
import {
	fireEvent,
	renderWithProviders,
	screen,
	userEvent,
	waitFor,
	within,
} from "@/testing/test-utils";
import { useDevicesUIStore } from "../../../store/devices-ui.store";
import { DeviceCard } from "../DeviceCard";

/** jsdom returns an all-zero rect by default; give the slider a real width
 * so the pointer-drag percentage math resolves to a real number instead of
 * NaN. Native PointerEvent capture (setPointerCapture) also isn't
 * meaningfully simulated by userEvent.pointer() in this jsdom setup, so
 * drag tests use fireEvent directly — same exception already used for the
 * identical pattern in LightControlPanel's brightness slider test. */
function mockSliderGeometry(slider: HTMLElement) {
	vi.spyOn(slider, "getBoundingClientRect").mockReturnValue({
		left: 0,
		top: 0,
		width: 100,
		height: 10,
		right: 100,
		bottom: 10,
		x: 0,
		y: 0,
		toJSON: () => {},
	});
	slider.setPointerCapture = vi.fn();
	slider.releasePointerCapture = vi.fn();
	slider.hasPointerCapture = vi.fn().mockReturnValue(true);
}

function mockTelemetry() {
	server.use(
		http.get("*/api/devices/:id/telemetry", () =>
			HttpResponse.json({
				deviceId: "device-light-1",
				deviceName: "Lâmpada da Sala",
				points: [],
			}),
		),
	);
}

describe("DeviceCard Integration Tests", () => {
	beforeEach(() => {
		useDevicesUIStore.setState({ editingDevice: null });
	});

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

	it("DeviceCard_CancelDeleteConfirmation_ShouldNotCallDeleteApi", async () => {
		// Arrange
		let deleteCalled = false;
		server.use(
			http.delete("*/api/devices/:id", async () => {
				deleteCalled = true;
				return new HttpResponse(null, { status: 204 });
			}),
		);
		const user = userEvent.setup();
		const mockDevice = createDeviceMock({ name: "Lâmpada da Sala" });
		renderWithProviders(<DeviceCard device={mockDevice} />);

		// Act
		await user.click(
			screen.getByRole("button", { name: /mais opções do dispositivo/i }),
		);
		await user.click(await screen.findByRole("menuitem", { name: /excluir/i }));
		const confirmDialog = await screen.findByRole("alertdialog");
		await user.click(
			within(confirmDialog).getByRole("button", { name: /^cancelar$/i }),
		);

		// Assert
		await waitFor(() => {
			expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
		});
		expect(deleteCalled).toBe(false);
		expect(screen.getByText("Lâmpada da Sala")).toBeInTheDocument();
	});

	it("DeviceCard_EditViaOptionsMenu_ShouldLoadDeviceIntoEditModalStore", async () => {
		// Arrange
		const user = userEvent.setup();
		const mockDevice = createDeviceMock({
			id: "device-edit-1",
			name: "Lâmpada da Sala",
		});
		renderWithProviders(<DeviceCard device={mockDevice} />);

		// Act
		await user.click(
			screen.getByRole("button", { name: /mais opções do dispositivo/i }),
		);
		await user.click(await screen.findByRole("menuitem", { name: /editar/i }));

		// Assert
		expect(useDevicesUIStore.getState().editingDevice).toEqual(mockDevice);
	});

	it("DeviceCard_ClickDeviceName_ShouldOpenTelemetrySheet", async () => {
		// Arrange
		mockTelemetry();
		const user = userEvent.setup();
		const mockDevice = createDeviceMock({
			id: "device-light-1",
			name: "Lâmpada da Sala",
		});
		renderWithProviders(<DeviceCard device={mockDevice} />);

		// Act
		await user.click(screen.getByRole("button", { name: "Lâmpada da Sala" }));

		// Assert
		const sheet = await screen.findByRole("dialog");
		expect(within(sheet).getByText("Lâmpada da Sala")).toBeInTheDocument();
	});

	it("DeviceCard_LightType_ShouldRenderBrightnessControl", () => {
		// Arrange
		const mockDevice = createDeviceMock({
			type: DeviceTypeEnum.Light,
			isOn: true,
		});

		// Act
		renderWithProviders(<DeviceCard device={mockDevice} />);

		// Assert
		expect(screen.getByText("Brilho")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Brilho" })).toBeInTheDocument();
	});

	it("DeviceCard_LightHasBrightness_ShouldInitializeSliderWithRemoteValue", () => {
		// Arrange
		const mockDevice = createDeviceMock({
			type: DeviceTypeEnum.Light,
			isOn: true,
			isOnline: true,
			brightness: 65,
		});

		// Act
		renderWithProviders(<DeviceCard device={mockDevice} />);

		// Assert
		expect(screen.getByText("65%")).toBeInTheDocument();
	});

	it("DeviceCard_LightBrightnessIsNull_ShouldFallbackTo50Percent", () => {
		// Arrange
		const mockDevice = createDeviceMock({
			type: DeviceTypeEnum.Light,
			isOn: true,
			isOnline: true,
			brightness: null,
		});

		// Act
		renderWithProviders(<DeviceCard device={mockDevice} />);

		// Assert
		expect(screen.getByText("50%")).toBeInTheDocument();
	});

	it("DeviceCard_LightBrightnessPropUpdatesWhenNotDragging_ShouldReflectNewValue", async () => {
		// Arrange — simulates a refetch (or a SignalR-driven update) bringing a
		// brightness set from somewhere else while the card stays mounted.
		const mockDevice = createDeviceMock({
			type: DeviceTypeEnum.Light,
			isOn: true,
			isOnline: true,
			brightness: 30,
		});
		const { rerender } = renderWithProviders(
			<DeviceCard device={mockDevice} />,
		);
		expect(screen.getByText("30%")).toBeInTheDocument();

		// Act
		rerender(<DeviceCard device={{ ...mockDevice, brightness: 90 }} />);

		// Assert
		expect(screen.getByText("90%")).toBeInTheDocument();
		expect(screen.queryByText("30%")).not.toBeInTheDocument();
	});

	it("DeviceCard_LightBrightnessPropUpdatesDuringActiveDrag_ShouldNotOverwriteLocalValueMidGesture", async () => {
		// Arrange
		const mockDevice = createDeviceMock({
			type: DeviceTypeEnum.Light,
			isOn: true,
			isOnline: true,
			brightness: 30,
		});
		const { rerender } = renderWithProviders(
			<DeviceCard device={mockDevice} />,
		);
		const slider = screen.getByRole("button", { name: "Brilho" });
		mockSliderGeometry(slider);

		// Act — starts dragging (sets local brightness to 75% via the pointer
		// position), then a concurrent refetch delivers a different remote value.
		fireEvent.pointerDown(slider, { clientX: 75, pointerId: 1 });
		expect(screen.getByText("75%")).toBeInTheDocument();

		rerender(<DeviceCard device={{ ...mockDevice, brightness: 90 }} />);

		// Assert — the mid-gesture value must survive the concurrent update
		expect(screen.getByText("75%")).toBeInTheDocument();
		expect(screen.queryByText("90%")).not.toBeInTheDocument();

		fireEvent.pointerUp(slider, { pointerId: 1 });
	});

	it("DeviceCard_LightBrightnessDragReleased_ShouldCommitBrightnessMutationWithDraggedValue", async () => {
		// Arrange
		let capturedBody: unknown = null;
		server.use(
			http.put("*/api/devices/:id/brightness", async ({ request }) => {
				capturedBody = await request.json();
				return new HttpResponse(null, { status: 200 });
			}),
		);
		const mockDevice = createDeviceMock({
			id: "device-light-1",
			type: DeviceTypeEnum.Light,
			isOn: true,
			isOnline: true,
			brightness: 30,
		});
		renderWithProviders(<DeviceCard device={mockDevice} />);
		const slider = screen.getByRole("button", { name: "Brilho" });
		mockSliderGeometry(slider);

		// Act
		fireEvent.pointerDown(slider, { clientX: 40, pointerId: 1 });
		fireEvent.pointerUp(slider, { pointerId: 1 });

		// Assert
		expect(screen.getByText("40%")).toBeInTheDocument();
		await waitFor(() => {
			expect(capturedBody).toEqual({ brightnessPercent: 40 });
		});
	});

	it("DeviceCard_SwitchType_ShouldRenderPowerConsumptionAndVoltage", () => {
		// Arrange
		const mockDevice = createDeviceMock({ type: DeviceTypeEnum.Switch });

		// Act
		renderWithProviders(<DeviceCard device={mockDevice} />);

		// Assert
		expect(screen.getByText("Consumo")).toBeInTheDocument();
		expect(screen.getByText("Tensão")).toBeInTheDocument();
		expect(screen.getByText("127V")).toBeInTheDocument();
	});

	it("DeviceCard_ThermostatType_ShouldRenderTemperatureControls", () => {
		// Arrange
		const mockDevice = createDeviceMock({ type: DeviceTypeEnum.Thermostat });

		// Act
		renderWithProviders(<DeviceCard device={mockDevice} />);

		// Assert
		expect(screen.getByText("TEMPERATURA ALVO")).toBeInTheDocument();
		expect(screen.getByText("22")).toBeInTheDocument();
	});

	it("DeviceCard_ThermostatTypeOffline_ShouldDisableTemperatureButtons", () => {
		// Arrange — the +/-/mode icon buttons carry no accessible name, so this
		// asserts on the DOM's disabled state directly rather than by role name.
		const mockDevice = createDeviceMock({
			type: DeviceTypeEnum.Thermostat,
			isOnline: false,
		});

		// Act
		const { container } = renderWithProviders(
			<DeviceCard device={mockDevice} />,
		);

		// Assert
		const temperatureSection = screen
			.getByText("TEMPERATURA ALVO")
			.closest("div")?.parentElement;
		const controlButtons = within(
			(temperatureSection ?? container) as HTMLElement,
		).getAllByRole("button");
		expect(controlButtons.length).toBeGreaterThan(0);
		for (const button of controlButtons) {
			expect(button).toBeDisabled();
		}
	});

	it("DeviceCard_ThermostatOnlineClickControls_ShouldAdjustTemperatureAndSwitchMode", async () => {
		// Arrange — +/-/mode buttons carry no accessible name; scope the query
		// to the temperature section and rely on click order (+, -, fan mode).
		const user = userEvent.setup();
		const mockDevice = createDeviceMock({
			type: DeviceTypeEnum.Thermostat,
			isOnline: true,
		});
		renderWithProviders(<DeviceCard device={mockDevice} />);
		const temperatureSection = screen
			.getByText("TEMPERATURA ALVO")
			.closest("div")?.parentElement as HTMLElement;
		const [increaseButton, decreaseButton, , fanModeButton] =
			within(temperatureSection).getAllByRole("button");

		// Act
		await user.click(increaseButton);
		await user.click(increaseButton);
		await user.click(decreaseButton);

		// Assert — 22 (default) + 1 + 1 - 1 = 23
		expect(screen.getByText("23")).toBeInTheDocument();

		// Act — switches from the default "cool" mode to "fan"
		await user.click(fanModeButton);

		// Assert
		expect(fanModeButton.className).toContain("bg-cool");
	});

	it("DeviceCard_TelevisionWithMediaPlaying_ShouldShowNowPlayingInfoAndReproducingBadge", async () => {
		// Arrange
		server.use(
			http.get("*/api/devices/:id/media", () =>
				HttpResponse.json({
					volumePercent: 30,
					isPlaying: true,
					title: "Filme em Cartaz",
					artist: "Estúdio X",
				}),
			),
		);
		const mockDevice = createDeviceMock({
			id: "tv-1",
			type: DeviceTypeEnum.Television,
			integrationType: IntegrationTypeEnum.AndroidTvAdb,
			isOnline: true,
		});

		// Act
		renderWithProviders(<DeviceCard device={mockDevice} />);

		// Assert
		expect(await screen.findByText("Filme em Cartaz")).toBeInTheDocument();
		expect(screen.getByText("REPRODUZINDO")).toBeInTheDocument();
	});

	it("DeviceCard_TelevisionOnlineAndAdbControllable_ShouldEnableVolumeControl", () => {
		// Arrange
		const mockDevice = createDeviceMock({
			type: DeviceTypeEnum.Television,
			integrationType: IntegrationTypeEnum.AndroidTvAdb,
			isOnline: true,
		});

		// Act
		renderWithProviders(<DeviceCard device={mockDevice} />);

		// Assert
		expect(screen.getByRole("button", { name: "Volume" })).toBeEnabled();
	});

	it("DeviceCard_TelevisionOffline_ShouldDisableVolumeControlAndShowOfflineLabel", () => {
		// Arrange
		const mockDevice = createDeviceMock({
			type: DeviceTypeEnum.Television,
			integrationType: IntegrationTypeEnum.AndroidTvAdb,
			isOnline: false,
		});

		// Act
		renderWithProviders(<DeviceCard device={mockDevice} />);

		// Assert
		expect(screen.getByRole("button", { name: "Volume" })).toBeDisabled();
		expect(screen.getAllByText("Dispositivo offline")[0]).toBeInTheDocument();
	});

	it("DeviceCard_TelevisionNotAdbControllable_ShouldDisableVolumeControlEvenOnline", () => {
		// Arrange — LG WebOS TVs aren't ADB-controllable, so volume can't be set.
		const mockDevice = createDeviceMock({
			type: DeviceTypeEnum.Television,
			integrationType: IntegrationTypeEnum.LgWebOs,
			isOnline: true,
		});

		// Act
		renderWithProviders(<DeviceCard device={mockDevice} />);

		// Assert
		expect(screen.getByRole("button", { name: "Volume" })).toBeDisabled();
	});

	it("DeviceCard_SensorType_ShouldRenderGenericOnOffStateBadge", () => {
		// Arrange
		const mockDevice = createDeviceMock({
			type: DeviceTypeEnum.Sensor,
			isOn: true,
			isOnline: true,
		});

		// Act
		renderWithProviders(<DeviceCard device={mockDevice} />);

		// Assert
		expect(screen.getByText("Estado")).toBeInTheDocument();
		expect(screen.getByText("Ligado")).toBeInTheDocument();
	});
});
