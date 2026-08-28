import { useQuery } from "@tanstack/react-query";
import { fetchRooms } from "../api/rooms.api";
import type { Room } from "../types/rooms.types";
import { roomsKeys } from "./rooms.keys";

/**
 * Custom Hook to fetch and cache all user rooms.
 * Configured with a 5-minute stale time for optimal network performance.
 */
export function useRooms() {
	return useQuery<Room[], Error>({
		queryKey: roomsKeys.lists(),
		queryFn: () => fetchRooms(),
		staleTime: 1000 * 60 * 5,
		retry: 1,
	});
}
