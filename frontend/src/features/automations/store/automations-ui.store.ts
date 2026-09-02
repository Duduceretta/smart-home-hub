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

	// List presentation state
	viewMode: AutomationViewMode;
	setViewMode: (mode: AutomationViewMode) => void;

	/** Item selecionado no painel master-detail (opcional, gerenciado primariamente pela URL ?automation=<id>). */
	selectedId: string | null;
	setSelectedId: (id: string | null) => void;

	// Create Wizard Modal State
	isCreateWizardOpen: boolean;
	openCreateWizard: () => void;
	closeCreateWizard: () => void;

	// Edit Modal State
	editingAutomation: Automation | null;
	openEditModal: (automation: Automation) => void;
	closeEditModal: () => void;
}

/**
 * Zustand store managing ephemeral client-side UI state (modal visibility,
 * active filters, view mode da lista).
 */
export const useAutomationsUIStore = create<AutomationsUIState>((set) => ({
	// Default Values
	query: "",
	filter: "all",
	sort: "name",
	viewMode: "cards",
	selectedId: null,
	isCreateWizardOpen: false,
	editingAutomation: null,

	// Filter Actions
	setQuery: (query) => set({ query }),
	setFilter: (filter) => set({ filter }),
	setSort: (sort) => set({ sort }),

	// List presentation actions
	setViewMode: (viewMode) => set({ viewMode }),

	// Selection actions (retrocompatibilidade, primariamente pela URL)
	setSelectedId: (selectedId) => set({ selectedId }),

	// Create Wizard Actions
	openCreateWizard: () => set({ isCreateWizardOpen: true }),
	closeCreateWizard: () => set({ isCreateWizardOpen: false }),

	// Edit Modal Actions
	openEditModal: (automation) => set({ editingAutomation: automation }),
	closeEditModal: () => set({ editingAutomation: null }),
}));
