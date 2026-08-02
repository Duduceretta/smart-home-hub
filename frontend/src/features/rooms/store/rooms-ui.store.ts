import { create } from "zustand";
import type { Room } from "../types/rooms.types";

/**
 * Interface defining the temporary UI state and actions for the Rooms feature.
 */
interface RoomsUIState {
	// Search and Filtering State
	query: string;
	setQuery: (query: string) => void;
	resetFilters: () => void;

	// Create Sheet Modal State
	isCreateSheetOpen: boolean;
	openCreateSheet: () => void;
	closeCreateSheet: () => void;

	// Edit Sheet Modal State
	editingRoom: Room | null;
	openEditSheet: (room: Room) => void;
	closeEditSheet: () => void;
}

/**
 * Zustand store managing efemeral client-side UI states
 * (modals visibility, active filters, selected room for edition).
 */
export const useRoomsUIStore = create<RoomsUIState>((set) => ({
	// Default Values
	query: "",
	isCreateSheetOpen: false,
	editingRoom: null,

	// Filter Actions
	setQuery: (query) => set({ query }),
	resetFilters: () => set({ query: "" }),

	// Create Sheet Actions
	openCreateSheet: () => set({ isCreateSheetOpen: true }),
	closeCreateSheet: () => set({ isCreateSheetOpen: false }),

	// Edit Sheet Actions
	openEditSheet: (room) => set({ editingRoom: room }),
	closeEditSheet: () => set({ editingRoom: null }),
}));