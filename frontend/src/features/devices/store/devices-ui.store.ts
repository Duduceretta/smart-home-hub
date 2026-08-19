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
	page: number;

	setQuery: (query: string) => void;
	setActiveTab: (tab: string) => void;
	setStatusFilter: (filter: StatusFilterType) => void;
	setSelectedRoomId: (roomId: string | null) => void;
	toggleOnlyOn: () => void;
	setViewMode: (mode: ViewModeType) => void;
	setPage: (page: number) => void;
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
	page: 1,
	isCreateSheetOpen: false,
	editingDevice: null,

	// Filter Actions (todas resetam a página para 1 — a página atual pode não
	// existir mais no novo conjunto filtrado)
	setQuery: (query) => set({ query, page: 1 }),
	setActiveTab: (activeTab) => set({ activeTab, page: 1 }),
	setStatusFilter: (filter) =>
		set((state) => ({
			statusFilter: state.statusFilter === filter ? null : filter,
			page: 1,
		})),
	setSelectedRoomId: (roomId) =>
		set((state) => ({
			selectedRoomId: state.selectedRoomId === roomId ? null : roomId,
			page: 1,
		})),
	toggleOnlyOn: () => set((state) => ({ onlyOn: !state.onlyOn, page: 1 })),
	setViewMode: (viewMode) => set({ viewMode }),
	setPage: (page) => set({ page }),
	resetFilters: () =>
		set({
			query: "",
			activeTab: "Todos",
			statusFilter: null,
			selectedRoomId: null,
			onlyOn: false,
			page: 1,
		}),

	// Create Sheet Actions
	openCreateSheet: () => set({ isCreateSheetOpen: true }),
	closeCreateSheet: () => set({ isCreateSheetOpen: false }),

	// Edit Sheet Actions
	openEditSheet: (device) => set({ editingDevice: device }),
	closeEditSheet: () => set({ editingDevice: null }),
}));
