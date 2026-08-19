import { create } from "zustand";
import type { Device, StatusFilterType } from "../types/devices.types";

export type ViewModeType = "grid" | "list";

/**
 * Interface defining the temporary UI state and actions for the Devices feature.
 */
interface DevicesUIState {
	// Search and Filtering State
	query: string;
	activeTab: string;
	statusFilter: StatusFilterType;
	selectedRoomId: string | null;
	onlyOn: boolean;
	viewMode: ViewModeType;

	setQuery: (query: string) => void;
	setActiveTab: (tab: string) => void;
	setStatusFilter: (filter: StatusFilterType) => void;
	setSelectedRoomId: (roomId: string | null) => void;
	toggleOnlyOn: () => void;
	setViewMode: (mode: ViewModeType) => void;
	resetFilters: () => void;

	// Create Sheet Modal State
	isCreateSheetOpen: boolean;
	openCreateSheet: () => void;
	closeCreateSheet: () => void;

	// Edit Sheet Modal State
	editingDevice: Device | null;
	openEditSheet: (device: Device) => void;
	closeEditSheet: () => void;
}

/**
 * Zustand store managing ephemeral client-side UI states
 * (modals visibility, active category/status filters, selected device for edition).
 */
export const useDevicesUIStore = create<DevicesUIState>((set) => ({
	// Default Values
	query: "",
	activeTab: "Todos",
	statusFilter: null,
	selectedRoomId: null,
	onlyOn: false,
	viewMode: "grid",
	isCreateSheetOpen: false,
	editingDevice: null,

	// Filter Actions
	setQuery: (query) => set({ query }),
	setActiveTab: (activeTab) => set({ activeTab }),
	setStatusFilter: (filter) =>
		set((state) => ({
			statusFilter: state.statusFilter === filter ? null : filter,
		})),
	setSelectedRoomId: (roomId) =>
		set((state) => ({
			selectedRoomId: state.selectedRoomId === roomId ? null : roomId,
		})),
	toggleOnlyOn: () => set((state) => ({ onlyOn: !state.onlyOn })),
	setViewMode: (viewMode) => set({ viewMode }),
	resetFilters: () =>
		set({
			query: "",
			activeTab: "Todos",
			statusFilter: null,
			selectedRoomId: null,
			onlyOn: false,
		}),

	// Create Sheet Actions
	openCreateSheet: () => set({ isCreateSheetOpen: true }),
	closeCreateSheet: () => set({ isCreateSheetOpen: false }),

	// Edit Sheet Actions
	openEditSheet: (device) => set({ editingDevice: device }),
	closeEditSheet: () => set({ editingDevice: null }),
}));
