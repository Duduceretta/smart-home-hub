export interface RoomsListFilters {
	query?: string;
}

/**
 * Factory for deterministic TanStack Query cache keys.
 * Uses immutable const tuples for strict typing and hierarchical invalidation.
 */
export const roomsKeys = {
	all: ["rooms"] as const,
	lists: () => [...roomsKeys.all, "list"] as const,
	list: (filters: RoomsListFilters = {}) =>
		[...roomsKeys.lists(), { filters }] as const,
	details: () => [...roomsKeys.all, "detail"] as const,
	detail: (id: string) => [...roomsKeys.details(), id] as const,
};