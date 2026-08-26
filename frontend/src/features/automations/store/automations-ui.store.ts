import { create } from "zustand";
import type { Automation } from "../types/automations.types";

/**
 * Interface defining the temporary UI state and actions for the Automations feature.
 */
interface AutomationsUIState {
	// Search and Filtering State
	query: string;
	setQuery: (query: string) => void;
	resetFilters: () => void;

	// Create Sheet Modal State
	isCreateSheetOpen: boolean;
	openCreateSheet: () => void;
	closeCreateSheet: () => void;

	// Edit Sheet Modal State
	editingAutomation: Automation | null;
	openEditSheet: (automation: Automation) => void;
	closeEditSheet: () => void;
}

/**
 * Zustand store managing ephemeral client-side UI state (modal visibility,
 * active filters, selected automation for edition).
 */
export const useAutomationsUIStore = create<AutomationsUIState>((set) => ({
	// Default Values
	query: "",
	isCreateSheetOpen: false,
	editingAutomation: null,

	// Filter Actions
	setQuery: (query) => set({ query }),
	resetFilters: () => set({ query: "" }),

	// Create Sheet Actions
	openCreateSheet: () => set({ isCreateSheetOpen: true }),
	closeCreateSheet: () => set({ isCreateSheetOpen: false }),

	// Edit Sheet Actions
	openEditSheet: (automation) => set({ editingAutomation: automation }),
	closeEditSheet: () => set({ editingAutomation: null }),
}));
