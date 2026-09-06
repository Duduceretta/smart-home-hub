import { beforeEach, describe, expect, it } from "vitest";
import { useDashboardPreviewStore } from "../dashboard-preview.store";

beforeEach(() => {
	useDashboardPreviewStore.setState({
		overridesByRoom: {},
		expandedByRoom: {},
		automationOverrides: null,
	});
	localStorage.clear();
});

describe("dashboard-preview.store Unit Tests", () => {
	it("setRoomPreview_NewRoomKey_ShouldAddOverrideForThatRoomOnly", () => {
		// Act
		useDashboardPreviewStore
			.getState()
			.setRoomPreview("room-01", ["device-a", "device-b"]);

		// Assert
		expect(useDashboardPreviewStore.getState().overridesByRoom).toEqual({
			"room-01": ["device-a", "device-b"],
		});
	});

	it("setRoomPreview_ExistingOtherRoom_ShouldNotOverwriteIt", () => {
		// Arrange
		useDashboardPreviewStore.getState().setRoomPreview("room-01", ["device-a"]);

		// Act
		useDashboardPreviewStore.getState().setRoomPreview("room-02", ["device-b"]);

		// Assert
		expect(useDashboardPreviewStore.getState().overridesByRoom).toEqual({
			"room-01": ["device-a"],
			"room-02": ["device-b"],
		});
	});

	it("clearRoomPreview_ExistingOverride_ShouldRemoveOnlyThatRoomsOverride", () => {
		// Arrange
		useDashboardPreviewStore.getState().setRoomPreview("room-01", ["device-a"]);
		useDashboardPreviewStore.getState().setRoomPreview("room-02", ["device-b"]);

		// Act
		useDashboardPreviewStore.getState().clearRoomPreview("room-01");

		// Assert
		expect(useDashboardPreviewStore.getState().overridesByRoom).toEqual({
			"room-02": ["device-b"],
		});
	});

	it("setRoomExpanded_ToggleOneRoom_ShouldNotAffectOtherRooms", () => {
		// Arrange
		useDashboardPreviewStore.getState().setRoomExpanded("room-01", true);
		useDashboardPreviewStore.getState().setRoomExpanded("room-02", true);

		// Act
		useDashboardPreviewStore.getState().setRoomExpanded("room-01", false);

		// Assert
		expect(useDashboardPreviewStore.getState().expandedByRoom).toEqual({
			"room-01": false,
			"room-02": true,
		});
	});

	it("setAllRoomsExpanded_MultipleRoomKeys_ShouldSetAllOfThemToSameValue", () => {
		// Act
		useDashboardPreviewStore
			.getState()
			.setAllRoomsExpanded(["room-01", "room-02", "room-03"], false);

		// Assert
		expect(useDashboardPreviewStore.getState().expandedByRoom).toEqual({
			"room-01": false,
			"room-02": false,
			"room-03": false,
		});
	});

	it("setAutomationPreview_ProvidedOrder_ShouldPersistExactOrderForReordering", () => {
		// Act — reordenação: automação que estava por último passa a ser a primeira
		useDashboardPreviewStore
			.getState()
			.setAutomationPreview(["automation-3", "automation-1", "automation-2"]);

		// Assert
		expect(useDashboardPreviewStore.getState().automationOverrides).toEqual([
			"automation-3",
			"automation-1",
			"automation-2",
		]);
	});

	it("clearAutomationPreview_ExistingOverride_ShouldResetToNull", () => {
		// Arrange
		useDashboardPreviewStore
			.getState()
			.setAutomationPreview(["automation-1", "automation-2"]);

		// Act
		useDashboardPreviewStore.getState().clearAutomationPreview();

		// Assert
		expect(useDashboardPreviewStore.getState().automationOverrides).toBeNull();
	});
});
