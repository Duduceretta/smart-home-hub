import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";
import { createDeviceInGroupMock } from "@/testing/mocks/device-groups.mock";
import { server } from "@/testing/mocks/server";
import {
	fireEvent,
	renderWithProviders,
	screen,
	waitFor,
} from "@/testing/test-utils";
import { DeviceGroupMasterControl } from "../DeviceGroupMasterControl";

describe("DeviceGroupMasterControl Integration Tests", () => {
	it("DeviceGroupMasterControl_GroupHasAverageBrightness_ShouldInitializeSliderWithRemoteValue", () => {
		// Arrange
		const devices = [
			createDeviceInGroupMock({ type: 1, isOn: true, isOnline: true }),
		];

		// Act
		renderWithProviders(
			<DeviceGroupMasterControl
				groupId="group-1"
				devices={devices}
				averageBrightness={65}
			/>,
		);

		// Assert
		expect(screen.getByText("65%")).toBeInTheDocument();
	});

	it("DeviceGroupMasterControl_NoLightMeetsAverageCriteria_ShouldFallbackTo50Percent", () => {
		// Arrange — backend returns null when no online light in the group has
		// a confirmed brightness value.
		const devices = [
			createDeviceInGroupMock({ type: 1, isOn: true, isOnline: true }),
		];

		// Act
		renderWithProviders(
			<DeviceGroupMasterControl
				groupId="group-1"
				devices={devices}
				averageBrightness={null}
			/>,
		);

		// Assert — falls back to a neutral midpoint, not a misleading number.
		expect(screen.getByText("50%")).toBeInTheDocument();
	});

	it("DeviceGroupMasterControl_AverageBrightnessPropUpdatesWhenIdle_ShouldReflectNewValue", () => {
		// Arrange — simulates a refetch after another user/automation changed
		// brightness elsewhere in the group.
		const devices = [
			createDeviceInGroupMock({ type: 1, isOn: true, isOnline: true }),
		];
		const { rerender } = renderWithProviders(
			<DeviceGroupMasterControl
				groupId="group-1"
				devices={devices}
				averageBrightness={30}
			/>,
		);
		expect(screen.getByText("30%")).toBeInTheDocument();

		// Act
		rerender(
			<DeviceGroupMasterControl
				groupId="group-1"
				devices={devices}
				averageBrightness={90}
			/>,
		);

		// Assert
		expect(screen.getByText("90%")).toBeInTheDocument();
		expect(screen.queryByText("30%")).not.toBeInTheDocument();
	});

	it("DeviceGroupMasterControl_AverageBrightnessPropUpdatesDuringActiveDrag_ShouldNotOverwriteLocalValueMidGesture", () => {
		// Arrange
		const devices = [
			createDeviceInGroupMock({ type: 1, isOn: true, isOnline: true }),
		];
		const { rerender } = renderWithProviders(
			<DeviceGroupMasterControl
				groupId="group-1"
				devices={devices}
				averageBrightness={30}
			/>,
		);
		const slider = screen.getByRole("slider", {
			name: "Ajustar brilho coletivo",
		});

		// Act — starts dragging (native range input, so the value change comes
		// from a "change" event, not pointer coordinates), then a concurrent
		// refetch delivers a different remote value mid-gesture.
		fireEvent.pointerDown(slider);
		fireEvent.change(slider, { target: { value: "75" } });
		expect(screen.getByText("75%")).toBeInTheDocument();

		rerender(
			<DeviceGroupMasterControl
				groupId="group-1"
				devices={devices}
				averageBrightness={90}
			/>,
		);

		// Assert — the mid-gesture value must survive the concurrent update
		expect(screen.getByText("75%")).toBeInTheDocument();
		expect(screen.queryByText("90%")).not.toBeInTheDocument();

		fireEvent.pointerUp(slider);
	});

	it("DeviceGroupMasterControl_DragReleased_ShouldCommitGroupBrightnessMutationWithDraggedValue", async () => {
		// Arrange
		let capturedBody: unknown = null;
		server.use(
			http.put(
				"*/api/device-groups/:id/devices/brightness",
				async ({ request }) => {
					capturedBody = await request.json();
					return new HttpResponse(null, { status: 200 });
				},
			),
		);
		const devices = [
			createDeviceInGroupMock({ type: 1, isOn: true, isOnline: true }),
		];
		renderWithProviders(
			<DeviceGroupMasterControl
				groupId="group-1"
				devices={devices}
				averageBrightness={30}
			/>,
		);
		const slider = screen.getByRole("slider", {
			name: "Ajustar brilho coletivo",
		});

		// Act
		fireEvent.pointerDown(slider);
		fireEvent.change(slider, { target: { value: "40" } });
		fireEvent.pointerUp(slider);

		// Assert
		expect(screen.getByText("40%")).toBeInTheDocument();
		await waitFor(() => {
			expect(capturedBody).toEqual({ brightnessPercent: 40 });
		});
	});
});
