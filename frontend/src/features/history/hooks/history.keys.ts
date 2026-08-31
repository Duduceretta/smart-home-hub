import type {
	GetHistoryParams,
	GetHistoryStatsParams,
} from "../types/history.types";

/**
 * Factory for deterministic TanStack Query cache keys for the History feature.
 */
export const historyKeys = {
	all: ["history"] as const,
	lists: () => [...historyKeys.all, "list"] as const,
	list: (params: GetHistoryParams) =>
		[...historyKeys.lists(), { params }] as const,
	stats: () => [...historyKeys.all, "stats"] as const,
	statsFiltered: (params: GetHistoryStatsParams) =>
		[...historyKeys.stats(), { params }] as const,
};
