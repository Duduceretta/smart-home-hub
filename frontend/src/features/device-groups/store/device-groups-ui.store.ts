import { create } from "zustand";
import type { DeviceGroup } from "../types/device-groups.types";

/**
 * Interface defining the temporary UI state and actions for the DeviceGroups feature.
 */
interface DeviceGroupsUIState {
	// Search and Filtering State
	query: string;
	setQuery: (query: string) => void;
	resetFilters: () => void;

	// Create Sheet Modal State
	isCreateSheetOpen: boolean;
	openCreateSheet: () => void;
	closeCreateSheet: () => void;

	// Edit Sheet Modal State
	editingGroup: DeviceGroup | null;
	openEditSheet: (group: DeviceGroup) => void;
	closeEditSheet: () => void;
}

/**
 * Zustand store managing efemeral client-side UI states
 * (modals visibility, active filters, selected group for edition).
 */
export const useDeviceGroupsUIStore = create<DeviceGroupsUIState>((set) => ({
	// Default Values
	query: "",
	isCreateSheetOpen: false,
	editingGroup: null,

	// Filter Actions
	setQuery: (query) => set({ query }),
	resetFilters: () => set({ query: "" }),

	// Create Sheet Actions
	openCreateSheet: () => set({ isCreateSheetOpen: true }),
	closeCreateSheet: () => set({ isCreateSheetOpen: false }),

	// Edit Sheet Actions
	openEditSheet: (group) => set({ editingGroup: group }),
	closeEditSheet: () => set({ editingGroup: null }),
}));
