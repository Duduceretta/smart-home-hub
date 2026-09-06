import { useQuery } from "@tanstack/react-query";
import { fetchRoomLookup } from "@/core/api/rooms-lookup.api";
import { ROOMS_QUERY_ROOT } from "@/core/constants/query-key-roots";

/**
 * Minimal read-only room lookup (id/name/icon) for features that need to
 * resolve or list rooms without importing from `features/rooms` (FSD
 * forbids cross-feature imports). Deliberately shares the same cache entry
 * as `rooms`'s own `useRooms()` — both key off `ROOMS_QUERY_ROOT` + "list" —
 * so a room create/rename/delete invalidates both without extra plumbing.
 */
export function useRoomLookup() {
	return useQuery({
		queryKey: [...ROOMS_QUERY_ROOT, "list"] as const,
		queryFn: fetchRoomLookup,
		staleTime: 1000 * 60 * 5,
		retry: 1,
	});
}
