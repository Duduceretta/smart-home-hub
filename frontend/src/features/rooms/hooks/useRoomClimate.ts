import { useQuery } from "@tanstack/react-query";
import { fetchRoomClimate } from "../api/room-climate.api";
import type { RoomClimate } from "../types/room-climate.types";
import { roomsKeys } from "./rooms.keys";

export function useRoomClimate(roomId: string) {
	return useQuery<RoomClimate, Error>({
		queryKey: roomsKeys.climate(roomId),
		queryFn: () => fetchRoomClimate(roomId),
		staleTime: 1000 * 30,
		retry: 1,
	});
}
