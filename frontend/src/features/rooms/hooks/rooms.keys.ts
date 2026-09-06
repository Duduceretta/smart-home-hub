import { ROOMS_QUERY_ROOT } from "@/core/constants/query-key-roots";

export interface RoomsListFilters {
	query?: string;
}

/**
 * Factory for deterministic TanStack Query cache keys.
 * Uses immutable const tuples for strict typing and hierarchical invalidation.
 * `all` shares its root with `core/hooks/useRoomLookup.ts` (see that file) so
 * a room create/rename/delete invalidates both without extra plumbing.
 */
export const roomsKeys = {
	all: ROOMS_QUERY_ROOT,
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
