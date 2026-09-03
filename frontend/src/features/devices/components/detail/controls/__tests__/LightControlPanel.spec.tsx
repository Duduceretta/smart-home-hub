import { HttpResponse, http } from "msw";
import { describe, expect, it, vi } from "vitest";
import { createDeviceMock } from "@/testing/mocks/device.mock";
import { server } from "@/testing/mocks/server";
import {
	fireEvent,
	renderWithProviders,
	screen,
	userEvent,
	waitFor,
} from "@/testing/test-utils";
import { LightControlPanel } from "../LightControlPanel";

/** The tab buttons stay disabled while the initial work-mode GET is in
 * flight, and that same GET resolving can override an early tab click
 * (see hasSyncedInitialTab in LightControlPanel.tsx) — so tests that need
 * the "Cor" tab wait for the "Branco" tab to become enabled first, then
 * click "Cor", to avoid racing the initial-tab sync effect. */
async function switchToColorTab(user: ReturnType<typeof userEvent.setup>) {
	await waitFor(() => {
		expect(screen.getByRole("button", { name: /Branco/i })).toBeEnabled();
	});
	await user.click(screen.getByRole("button", { name: "Cor" }));
}

/** colorTemp has no visible numeric label — only the thumb's `left` inline
 * style reflects the value — so tests read it off the DOM directly. */
function readColorTempThumbLeft(slider: HTMLElement): string | undefined {
	return (slider.querySelector("div > div") as HTMLElement | null)?.style.left;
}

function mockWorkMode() {
	server.use(
		http.get("*/api/devices/:id/work-mode", () =>
			HttpResponse.json({ workMode: "white" }),
		),
		// switchTab() PUTs the new mode for real; leaving this unmocked makes
		// the request fail and its onError revert the optimistic tab switch.
		http.put(
			"*/api/devices/:id/work-mode",
			() => new HttpResponse(null, { status: 200 }),
		),
	);
}

/** jsdom returns an all-zero rect by default; give the slider a real width
 * so the pointer-drag percentage math resolves to a real number instead of
 * NaN. Native PointerEvent capture (setPointerCapture) also isn't
 * meaningfully simulated by userEvent.pointer() in this jsdom setup, so
 * this drag test uses fireEvent directly — same exception already used for
 * the identical pattern in SpotifyNowPlayingCard's volume slider test. */
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

describe("LightControlPanel Integration Tests", () => {
	it("LightControlPanel_DeviceHasBrightness_ShouldInitializeSliderWithRemoteValue", async () => {
		// Arrange
		mockWorkMode();
		const device = createDeviceMock({
			isOnline: true,
			isOn: true,
			brightness: 65,
		});

		// Act
		renderWithProviders(<LightControlPanel device={device} />);

		// Assert
		expect(await screen.findByText("65")).toBeInTheDocument();
	});

	it("LightControlPanel_DeviceBrightnessIsNull_ShouldFallbackTo50Percent", async () => {
		// Arrange
		mockWorkMode();
		const device = createDeviceMock({
			isOnline: true,
			isOn: true,
			brightness: null,
		});

		// Act
		renderWithProviders(<LightControlPanel device={device} />);

		// Assert
		expect(await screen.findByText("50")).toBeInTheDocument();
	});

	it("LightControlPanel_DevicePropUpdatesWithNewBrightness_ShouldReflectNewValueWhenNotDragging", async () => {
		// Arrange — simulates a refetch (or a SignalR-driven update) bringing a
		// brightness set from somewhere else while the panel stays mounted.
		mockWorkMode();
		const device = createDeviceMock({
			isOnline: true,
			isOn: true,
			brightness: 30,
		});
		const { rerender } = renderWithProviders(
			<LightControlPanel device={device} />,
		);
		expect(await screen.findByText("30")).toBeInTheDocument();

		// Act
		rerender(<LightControlPanel device={{ ...device, brightness: 90 }} />);

		// Assert
		expect(await screen.findByText("90")).toBeInTheDocument();
		expect(screen.queryByText("30")).not.toBeInTheDocument();
	});

	it("LightControlPanel_DevicePropUpdatesDuringActiveDrag_ShouldNotOverwriteLocalValueMidGesture", async () => {
		// Arrange
		mockWorkMode();
		const device = createDeviceMock({
			isOnline: true,
			isOn: true,
			brightness: 30,
		});
		const { rerender } = renderWithProviders(
			<LightControlPanel device={device} />,
		);
		const slider = await screen.findByRole("button", { name: "Brilho" });
		mockSliderGeometry(slider);

		// Act — starts dragging (sets local brightness to 75% via the pointer
		// position), then a concurrent refetch delivers a different remote value.
		fireEvent.pointerDown(slider, { clientX: 75, pointerId: 1 });
		expect(await screen.findByText("75")).toBeInTheDocument();

		rerender(<LightControlPanel device={{ ...device, brightness: 90 }} />);

		// Assert — the mid-gesture value must survive the concurrent update
		expect(screen.getByText("75")).toBeInTheDocument();
		expect(screen.queryByText("90")).not.toBeInTheDocument();

		fireEvent.pointerUp(slider, { pointerId: 1 });
	});

	it("LightControlPanel_DragReleased_ShouldCommitBrightnessMutationWithDraggedValue", async () => {
		// Arrange
		mockWorkMode();
		let capturedBody: unknown = null;
		server.use(
			http.put("*/api/devices/:id/brightness", async ({ request }) => {
				capturedBody = await request.json();
				return new HttpResponse(null, { status: 200 });
			}),
		);
		const device = createDeviceMock({
			isOnline: true,
			isOn: true,
			brightness: 30,
		});
		renderWithProviders(<LightControlPanel device={device} />);
		const slider = await screen.findByRole("button", { name: "Brilho" });
		mockSliderGeometry(slider);

		// Act
		fireEvent.pointerDown(slider, { clientX: 40, pointerId: 1 });
		fireEvent.pointerUp(slider, { pointerId: 1 });

		// Assert
		await screen.findByText("40");
		expect(capturedBody).toEqual({ brightnessPercent: 40 });
	});

	// --- Temperatura de cor ---

	it("LightControlPanel_DeviceHasColorTempPercent_ShouldInitializeSliderWithRemoteValue", async () => {
		// Arrange
		mockWorkMode();
		const device = createDeviceMock({
			isOnline: true,
			isOn: true,
			supportsColor: true,
			colorTempPercent: 65,
		});

		// Act
		renderWithProviders(<LightControlPanel device={device} />);

		// Assert
		const slider = await screen.findByRole("button", { name: "Temperatura" });
		expect(readColorTempThumbLeft(slider)).toBe("calc(65% - 7px)");
	});

	it("LightControlPanel_DeviceColorTempPercentIsNull_ShouldFallbackToMidpoint", async () => {
		// Arrange
		mockWorkMode();
		const device = createDeviceMock({
			isOnline: true,
			isOn: true,
			supportsColor: true,
			colorTempPercent: null,
		});

		// Act
		renderWithProviders(<LightControlPanel device={device} />);

		// Assert
		const slider = await screen.findByRole("button", { name: "Temperatura" });
		expect(readColorTempThumbLeft(slider)).toBe("calc(50% - 7px)");
	});

	it("LightControlPanel_ColorTempPropUpdatesDuringActiveDrag_ShouldNotOverwriteLocalValueMidGesture", async () => {
		// Arrange
		mockWorkMode();
		const device = createDeviceMock({
			isOnline: true,
			isOn: true,
			supportsColor: true,
			colorTempPercent: 30,
		});
		const { rerender } = renderWithProviders(
			<LightControlPanel device={device} />,
		);
		const slider = await screen.findByRole("button", { name: "Temperatura" });
		mockSliderGeometry(slider);

		// Act
		fireEvent.pointerDown(slider, { clientX: 75, pointerId: 1 });
		expect(readColorTempThumbLeft(slider)).toBe("calc(75% - 7px)");

		rerender(
			<LightControlPanel device={{ ...device, colorTempPercent: 90 }} />,
		);

		// Assert — mid-gesture value survives the concurrent update
		expect(readColorTempThumbLeft(slider)).toBe("calc(75% - 7px)");

		fireEvent.pointerUp(slider, { pointerId: 1 });
	});

	it("LightControlPanel_ColorTempDragReleased_ShouldCommitMutationWithDraggedValue", async () => {
		// Arrange
		mockWorkMode();
		let capturedBody: unknown = null;
		server.use(
			http.put("*/api/devices/:id/color-temp", async ({ request }) => {
				capturedBody = await request.json();
				return new HttpResponse(null, { status: 200 });
			}),
		);
		const device = createDeviceMock({
			isOnline: true,
			isOn: true,
			supportsColor: true,
			colorTempPercent: 30,
		});
		renderWithProviders(<LightControlPanel device={device} />);
		const slider = await screen.findByRole("button", { name: "Temperatura" });
		mockSliderGeometry(slider);

		// Act
		fireEvent.pointerDown(slider, { clientX: 40, pointerId: 1 });
		fireEvent.pointerUp(slider, { pointerId: 1 });

		// Assert
		await vi.waitFor(() => {
			expect(capturedBody).toEqual({ colorTempPercent: 40 });
		});
	});

	// --- Cor ---

	it("LightControlPanel_DeviceHasColorHex_ShouldHighlightMatchingPresetSwatch", async () => {
		// Arrange
		mockWorkMode();
		const device = createDeviceMock({
			isOnline: true,
			isOn: true,
			supportsColor: true,
			colorHex: "#00FF00", // design-token-lint-ignore
		});
		const user = userEvent.setup();
		renderWithProviders(<LightControlPanel device={device} />);

		// Act
		await switchToColorTab(user);

		// Assert
		expect(
			// design-token-lint-ignore: cor real da lâmpada (dado de domínio), não decisão de estilo
			await screen.findByRole("button", { name: "#00FF00", pressed: true }),
		).toBeInTheDocument();
	});

	it("LightControlPanel_ClickPresetSwatch_ShouldCommitColorMutationAndUpdateSelection", async () => {
		// Arrange
		mockWorkMode();
		let capturedBody: unknown = null;
		server.use(
			http.put("*/api/devices/:id/color", async ({ request }) => {
				capturedBody = await request.json();
				return new HttpResponse(null, { status: 200 });
			}),
		);
		const device = createDeviceMock({
			isOnline: true,
			isOn: true,
			supportsColor: true,
			colorHex: "#FFFFFF", // design-token-lint-ignore
		});
		const user = userEvent.setup();
		renderWithProviders(<LightControlPanel device={device} />);
		await switchToColorTab(user);

		// Act
		// design-token-lint-ignore: cor real da lâmpada (dado de domínio), não decisão de estilo
		await user.click(screen.getByRole("button", { name: "#0000FF" }));

		// Assert
		expect(
			// design-token-lint-ignore: cor real da lâmpada (dado de domínio), não decisão de estilo
			screen.getByRole("button", { name: "#0000FF", pressed: true }),
		).toBeInTheDocument();
		await vi.waitFor(() => {
			expect(capturedBody).toEqual({ colorHex: "#0000FF" }); // design-token-lint-ignore
		});
	});

	it("LightControlPanel_ColorHexPropUpdatesDuringActiveWheelDrag_ShouldNotOverwriteWheelPosition", async () => {
		// Arrange — the color wheel guards its own sync internally (no numeric
		// label to assert on), so this checks the thumb's pixel position
		// (left/top) stays put across a concurrent device prop update.
		mockWorkMode();
		const device = createDeviceMock({
			isOnline: true,
			isOn: true,
			supportsColor: true,
			colorHex: "#FFFFFF", // design-token-lint-ignore
		});
		const user = userEvent.setup();
		const { rerender } = renderWithProviders(
			<LightControlPanel device={device} />,
		);
		await switchToColorTab(user);

		const wheel = screen.getByRole("slider", { name: "Cor" });
		vi.spyOn(wheel, "getBoundingClientRect").mockReturnValue({
			left: 0,
			top: 0,
			width: 168,
			height: 168,
			right: 168,
			bottom: 168,
			x: 0,
			y: 0,
			toJSON: () => {},
		});
		wheel.setPointerCapture = vi.fn();
		wheel.releasePointerCapture = vi.fn();
		wheel.hasPointerCapture = vi.fn().mockReturnValue(true);

		// Act
		fireEvent.pointerDown(wheel, { clientX: 130, clientY: 84, pointerId: 1 });
		const thumbAfterDrag = (wheel.firstElementChild as HTMLElement).style.left;

		// design-token-lint-ignore: cor real da lâmpada (dado de domínio), não decisão de estilo
		rerender(<LightControlPanel device={{ ...device, colorHex: "#00FF00" }} />);

		// Assert
		expect((wheel.firstElementChild as HTMLElement).style.left).toBe(
			thumbAfterDrag,
		);

		fireEvent.pointerUp(wheel, { pointerId: 1 });
	});
});
