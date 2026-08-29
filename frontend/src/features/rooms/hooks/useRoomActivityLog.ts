import { useQuery } from "@tanstack/react-query";
import { fetchRoomActivityLog } from "../api/rooms.api";
import type { RoomActivityEntry } from "../types/rooms.types";
import { roomsKeys } from "./rooms.keys";

/** Eventos recentes deste ambiente — filtro feito no back-end. */
export function useRoomActivityLog(roomId: string) {
	return useQuery<RoomActivityEntry[], Error>({
		queryKey: roomsKeys.activityLog(roomId),
		queryFn: () => fetchRoomActivityLog(roomId),
		staleTime: 1000 * 30,
		retry: 1,
	});
}
