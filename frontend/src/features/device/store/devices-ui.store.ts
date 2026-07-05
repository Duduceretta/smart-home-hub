import { create } from "zustand";
import type { Device, StatusFilterType } from "../types/devices.types";

interface DevicesUIState {
	query: string;
	activeTab: string;
	statusFilter: StatusFilterType;
	setQuery: (query: string) => void;
	setActiveTab: (tab: string) => void;
	setStatusFilter: (filter: StatusFilterType) => void;
	resetFilters: () => void;

	isCreateSheetOpen: boolean;
	openCreateSheet: () => void;
	closeCreateSheet: () => void;

	editingDevice: Device | null;
	openEditSheet: (device: Device) => void;
	closeEditSheet: () => void;
}

export const useDevicesUIStore = create<DevicesUIState>((set) => ({
	query: "",
	activeTab: "Todos",
	statusFilter: null,
	isCreateSheetOpen: false,
	editingDevice: null,

	setQuery: (query) => set({ query }),
	setActiveTab: (activeTab) => set({ activeTab }),
	setStatusFilter: (filter) =>
		set((state) => ({
			statusFilter: state.statusFilter === filter ? null : filter,
		})),
	resetFilters: () =>
		set({ query: "", activeTab: "Todos", statusFilter: null }),

	openCreateSheet: () => set({ isCreateSheetOpen: true }),
	closeCreateSheet: () => set({ isCreateSheetOpen: false }),

	openEditSheet: (device) => set({ editingDevice: device }),
	closeEditSheet: () => set({ editingDevice: null }),
}));
