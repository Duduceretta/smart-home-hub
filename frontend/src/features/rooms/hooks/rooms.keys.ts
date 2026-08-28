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
	pickerDevices: () => [...roomsKeys.all, "picker-devices"] as const,
	climate: (roomId: string) =>
		[...roomsKeys.detail(roomId), "climate"] as const,
	energy: (roomId: string, range: string) =>
		[...roomsKeys.detail(roomId), "energy", range] as const,
	automations: (roomId: string) =>
		[...roomsKeys.detail(roomId), "automations"] as const,
	activityLog: (roomId: string) =>
		[...roomsKeys.detail(roomId), "activity-log"] as const,
};
