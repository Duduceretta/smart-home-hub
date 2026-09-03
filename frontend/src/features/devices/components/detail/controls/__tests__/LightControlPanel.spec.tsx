import { HttpResponse, http } from "msw";
import { describe, expect, it, vi } from "vitest";
import { createDeviceMock } from "@/testing/mocks/device.mock";
import { server } from "@/testing/mocks/server";
import { fireEvent, renderWithProviders, screen } from "@/testing/test-utils";
import { LightControlPanel } from "../LightControlPanel";

function mockWorkMode() {
	server.use(
		http.get("*/api/devices/:id/work-mode", () =>
			HttpResponse.json({ workMode: "white" }),
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
});
