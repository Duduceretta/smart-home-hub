import type { GetHistoryParams } from "../types/history.types";

/**
 * Factory for deterministic TanStack Query cache keys for the History feature.
 */
export const historyKeys = {
	all: ["history"] as const,
	lists: () => [...historyKeys.all, "list"] as const,
	list: (params: GetHistoryParams) =>
		[...historyKeys.lists(), { params }] as const,
};
