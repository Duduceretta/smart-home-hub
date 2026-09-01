import { create } from "zustand";
import type {
	HistoryEvent,
	HistoryTimeframePreset,
} from "../types/history.types";

export interface PendingEventsState {
	items: HistoryEvent[];
	total: number;
	mediaPlaybackCount: number;
}

interface HistoryUIState {
	searchQuery: string;
	selectedSeverity: string | "all";
	selectedSource: string | "all";
	timeframe: HistoryTimeframePreset;
	customStartDateUtc: string | null;
	customEndDateUtc: string | null;
	page: number;
	pageSize: number;
	selectedEvent: HistoryEvent | null;
	expandedEventIds: string[];
	pendingEvents: PendingEventsState;

	// Actions
	setSearchQuery: (query: string) => void;
	setSelectedSeverity: (severity: string | "all") => void;
	setSelectedSource: (source: string | "all") => void;
	setTimeframe: (timeframe: HistoryTimeframePreset) => void;
	setCustomDateRange: (startUtc: string, endUtc: string) => void;
	setPage: (page: number) => void;
	setPageSize: (pageSize: number) => void;
	setSelectedEvent: (event: HistoryEvent | null) => void;
	toggleExpandEvent: (id: string) => void;
	expandAllEvents: (ids: string[]) => void;
	collapseAllEvents: () => void;
	setPendingEvents: (events: HistoryEvent[]) => void;
	clearPendingEvents: () => void;
	resetFilters: () => void;
}

export const useHistoryUIStore = create<HistoryUIState>((set) => ({
	searchQuery: "",
	selectedSeverity: "all",
	selectedSource: "all",
	timeframe: "7d",
	customStartDateUtc: null,
	customEndDateUtc: null,
	page: 1,
	pageSize: 20,
	selectedEvent: null,
	expandedEventIds: [],
	pendingEvents: {
		items: [],
		total: 0,
		mediaPlaybackCount: 0,
	},

	setSearchQuery: (query) => set({ searchQuery: query, page: 1 }),
	setSelectedSeverity: (severity) =>
		set({ selectedSeverity: severity, page: 1 }),
	setSelectedSource: (source) => set({ selectedSource: source, page: 1 }),
	setTimeframe: (timeframe) =>
		set({
			timeframe,
			page: 1,
			customStartDateUtc: null,
			customEndDateUtc: null,
		}),
	setCustomDateRange: (startUtc, endUtc) =>
		set({
			timeframe: "custom",
			customStartDateUtc: startUtc,
			customEndDateUtc: endUtc,
			page: 1,
		}),
	setPage: (page) => set({ page }),
	setPageSize: (pageSize) => set({ pageSize, page: 1 }),
	setSelectedEvent: (event) => set({ selectedEvent: event }),
	toggleExpandEvent: (id) =>
		set((state) => ({
			expandedEventIds: state.expandedEventIds.includes(id)
				? state.expandedEventIds.filter((item) => item !== id)
				: [...state.expandedEventIds, id],
		})),
	expandAllEvents: (ids) => set({ expandedEventIds: ids }),
	collapseAllEvents: () => set({ expandedEventIds: [] }),
	setPendingEvents: (events) =>
		set((state) => {
			const existingIds = new Set(state.pendingEvents.items.map((e) => e.id));
			const uniqueIncoming = events.filter((e) => !existingIds.has(e.id));
			const combined = [...uniqueIncoming, ...state.pendingEvents.items];
			return {
				pendingEvents: {
					items: combined,
					total: combined.length,
					mediaPlaybackCount: combined.filter(
						(e) => e.eventType === "MediaPlayback",
					).length,
				},
			};
		}),
	clearPendingEvents: () =>
		set({
			pendingEvents: {
				items: [],
				total: 0,
				mediaPlaybackCount: 0,
			},
		}),
	resetFilters: () =>
		set({
			searchQuery: "",
			selectedSeverity: "all",
			selectedSource: "all",
			timeframe: "7d",
			customStartDateUtc: null,
			customEndDateUtc: null,
			page: 1,
			expandedEventIds: [],
			pendingEvents: {
				items: [],
				total: 0,
				mediaPlaybackCount: 0,
			},
		}),
}));
