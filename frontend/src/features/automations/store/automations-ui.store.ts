import { create } from "zustand";
import type {
	Automation,
	AutomationFilter,
	AutomationSort,
	AutomationViewMode,
} from "../types/automations.types";

/**
 * Interface defining the temporary UI state and actions for the Automations feature.
 */
interface AutomationsUIState {
	// Search and Filtering State
	query: string;
	setQuery: (query: string) => void;
	filter: AutomationFilter;
	setFilter: (filter: AutomationFilter) => void;
	sort: AutomationSort;
	setSort: (sort: AutomationSort) => void;
	resetFilters: () => void;

	// List presentation state
	viewMode: AutomationViewMode;
	setViewMode: (mode: AutomationViewMode) => void;

	// Master-detail selection state
	selectedId: string | null;
	setSelectedId: (id: string | null) => void;

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
 * active filters, seleção master-detail, view mode da lista).
 */
export const useAutomationsUIStore = create<AutomationsUIState>((set) => ({
	// Default Values
	query: "",
	filter: "all",
	sort: "name",
	viewMode: "cards",
	selectedId: null,
	isCreateSheetOpen: false,
	editingAutomation: null,

	// Filter Actions
	setQuery: (query) => set({ query }),
	setFilter: (filter) => set({ filter }),
	setSort: (sort) => set({ sort }),
	resetFilters: () => set({ query: "", filter: "all", sort: "name" }),

	// List presentation actions
	setViewMode: (viewMode) => set({ viewMode }),

	// Selection actions
	setSelectedId: (selectedId) => set({ selectedId }),

	// Create Sheet Actions
	openCreateSheet: () => set({ isCreateSheetOpen: true }),
	closeCreateSheet: () => set({ isCreateSheetOpen: false }),

	// Edit Sheet Actions
	openEditSheet: (automation) => set({ editingAutomation: automation }),
	closeEditSheet: () => set({ editingAutomation: null }),
}));
