import { useQuery } from "@tanstack/react-query";
import { fetchRoomEnergy } from "../api/rooms.api";
import type { RoomEnergy, RoomEnergyRange } from "../types/rooms.types";
import { roomsKeys } from "./rooms.keys";

export function useRoomEnergy(roomId: string, range: RoomEnergyRange) {
	return useQuery<RoomEnergy, Error>({
		queryKey: roomsKeys.energy(roomId, range),
		queryFn: () => fetchRoomEnergy(roomId, range),
		staleTime: 1000 * 30,
		retry: 1,
	});
}
