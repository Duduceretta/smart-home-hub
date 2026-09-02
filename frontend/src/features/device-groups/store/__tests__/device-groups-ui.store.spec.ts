import { beforeEach, describe, expect, it } from "vitest";
import { createDeviceGroupMock } from "@/testing/mocks/device-groups.mock";
import { useDeviceGroupsUIStore } from "../device-groups-ui.store";

describe("device-groups-ui.store Unit Tests", () => {
	beforeEach(() => {
		useDeviceGroupsUIStore.setState({
			selectedGroupId: null,
			viewMode: "cards",
			query: "",
			isCreateDialogOpen: false,
			editingGroup: null,
			editDialogFocusDevices: false,
		});
	});

	it("openCreateDialog_CalledFromCleanState_ShouldOpenDialogInCreateMode", () => {
		// Arrange
		const { openCreateDialog } = useDeviceGroupsUIStore.getState();

		// Act
		openCreateDialog();

		// Assert
		const state = useDeviceGroupsUIStore.getState();
		expect(state.isCreateDialogOpen).toBe(true);
		expect(state.editingGroup).toBeNull();
		expect(state.editDialogFocusDevices).toBe(false);
	});

	it("openEditDialog_CalledWithGroup_ShouldLoadGroupIntoStateAndCloseCreateMode", () => {
		// Arrange
		const group = createDeviceGroupMock({
			id: "group-42",
			name: "Home Theater",
		});
		const { openEditDialog } = useDeviceGroupsUIStore.getState();

		// Act
		openEditDialog(group);

		// Assert
		const state = useDeviceGroupsUIStore.getState();
		expect(state.editingGroup).toEqual(group);
		expect(state.isCreateDialogOpen).toBe(false);
		expect(state.editDialogFocusDevices).toBe(false);
	});

	it("openEditDialog_CalledWithFocusDevicesOption_ShouldSetFocusDevicesFlag", () => {
		// Arrange
		const group = createDeviceGroupMock();
		const { openEditDialog } = useDeviceGroupsUIStore.getState();

		// Act
		openEditDialog(group, { focusDevices: true });

		// Assert
		expect(useDeviceGroupsUIStore.getState().editDialogFocusDevices).toBe(true);
	});

	it("closeFormDialog_CalledWhileEditing_ShouldResetAllDialogFields", () => {
		// Arrange
		const group = createDeviceGroupMock();
		useDeviceGroupsUIStore.getState().openEditDialog(group, {
			focusDevices: true,
		});

		// Act
		useDeviceGroupsUIStore.getState().closeFormDialog();

		// Assert
		const state = useDeviceGroupsUIStore.getState();
		expect(state.isCreateDialogOpen).toBe(false);
		expect(state.editingGroup).toBeNull();
		expect(state.editDialogFocusDevices).toBe(false);
	});

	it("openCreateDialog_CalledAfterPriorEditSession_ShouldNotRetainPreviousEditingGroup", () => {
		// Arrange — simulates editing a group, then opening the "new group" flow
		// without an explicit close in between (e.g. user navigates directly).
		const previousGroup = createDeviceGroupMock({
			id: "group-old",
			name: "Grupo Antigo",
		});
		useDeviceGroupsUIStore.getState().openEditDialog(previousGroup);
		expect(useDeviceGroupsUIStore.getState().editingGroup).toEqual(
			previousGroup,
		);

		// Act
		useDeviceGroupsUIStore.getState().openCreateDialog();

		// Assert
		const state = useDeviceGroupsUIStore.getState();
		expect(state.editingGroup).toBeNull();
		expect(state.isCreateDialogOpen).toBe(true);
	});

	it("openEditDialog_CalledForDifferentGroupWhileEditingAnother_ShouldSwitchToNewGroup", () => {
		// Arrange
		const groupA = createDeviceGroupMock({ id: "group-a", name: "Grupo A" });
		const groupB = createDeviceGroupMock({ id: "group-b", name: "Grupo B" });
		useDeviceGroupsUIStore.getState().openEditDialog(groupA);

		// Act
		useDeviceGroupsUIStore.getState().openEditDialog(groupB);

		// Assert
		expect(useDeviceGroupsUIStore.getState().editingGroup).toEqual(groupB);
	});
});
