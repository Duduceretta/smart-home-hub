import { create } from "zustand";
import type {
	DeviceGroup,
	DeviceGroupsViewMode,
} from "../types/device-groups.types";

/**
 * Interface defining the UI state and actions for the DeviceGroups feature.
 * Follows the Master-Detail pattern established in the Rooms and Automations features.
 */
interface DeviceGroupsUIState {
	// Selection & View Mode
	selectedGroupId: string | null;
	setSelectedGroupId: (id: string | null) => void;
	viewMode: DeviceGroupsViewMode;
	setViewMode: (mode: DeviceGroupsViewMode) => void;

	// Search Query
	query: string;
	setQuery: (query: string) => void;
	resetFilters: () => void;

	// Dialog / Modal Form State
	isCreateDialogOpen: boolean;
	editingGroup: DeviceGroup | null;
	editDialogFocusDevices: boolean;
	openCreateDialog: () => void;
	openEditDialog: (
		group: DeviceGroup,
		options?: { focusDevices?: boolean },
	) => void;
	closeFormDialog: () => void;
}

/**
 * Zustand store managing ephemeral client-side UI states
 * (selection, master-detail list mode, dialogs visibility).
 */
export const useDeviceGroupsUIStore = create<DeviceGroupsUIState>((set) => ({
	// Selection & View Mode Defaults
	selectedGroupId: null,
	setSelectedGroupId: (id) => set({ selectedGroupId: id }),
	viewMode: "cards",
	setViewMode: (viewMode) => set({ viewMode }),

	// Search Query
	query: "",
	setQuery: (query) => set({ query }),
	resetFilters: () => set({ query: "" }),

	// Dialog Form
	isCreateDialogOpen: false,
	editingGroup: null,
	editDialogFocusDevices: false,
	openCreateDialog: () =>
		set({
			isCreateDialogOpen: true,
			editingGroup: null,
			editDialogFocusDevices: false,
		}),
	openEditDialog: (group, options) =>
		set({
			editingGroup: group,
			isCreateDialogOpen: false,
			editDialogFocusDevices: options?.focusDevices ?? false,
		}),
	closeFormDialog: () =>
		set({
			isCreateDialogOpen: false,
			editingGroup: null,
			editDialogFocusDevices: false,
		}),
}));
