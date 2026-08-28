import { useQuery } from "@tanstack/react-query";
import { fetchRoomAutomations } from "../api/room-automations.api";
import type { RoomLinkedAutomation } from "../types/room-automations.types";
import { roomsKeys } from "./rooms.keys";

/** Automações vinculadas a este ambiente — cruzamento já feito no back-end. */
export function useRoomAutomations(roomId: string) {
	return useQuery<RoomLinkedAutomation[], Error>({
		queryKey: roomsKeys.automations(roomId),
		queryFn: () => fetchRoomAutomations(roomId),
		staleTime: 1000 * 60,
		retry: 1,
	});
}
