import { create } from "zustand";
import type { StatusFilterType } from "../types/devices.types";

interface DevicesUIState {
	query: string;
	activeTab: string;
	statusFilter: StatusFilterType;
	isCreateSheetOpen: boolean;
	setQuery: (query: string) => void;
	setActiveTab: (tab: string) => void;
	setStatusFilter: (filter: StatusFilterType) => void;
	openCreateSheet: () => void;
	closeCreateSheet: () => void;
	resetFilters: () => void;
}

export const useDevicesUIStore = create<DevicesUIState>((set) => ({
	query: "",
	activeTab: "Todos",
	statusFilter: null,
	isCreateSheetOpen: false,

	setQuery: (query) => set({ query }),
	setActiveTab: (activeTab) => set({ activeTab }),
	setStatusFilter: (filter) =>
		set((state) => ({
			statusFilter: state.statusFilter === filter ? null : filter,
		})),
	openCreateSheet: () => set({ isCreateSheetOpen: true }),
	closeCreateSheet: () => set({ isCreateSheetOpen: false }),
	resetFilters: () =>
		set({ query: "", activeTab: "Todos", statusFilter: null }),
}));
