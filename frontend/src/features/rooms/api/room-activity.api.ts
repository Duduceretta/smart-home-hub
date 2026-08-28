import { apiClient } from "@/core/api/api.client";
import { handleApplicationError } from "@/core/errors/app.errors";
import type { PagedResponse } from "@/core/types/pagination.types";
import type { RoomActivityEntry } from "../types/room-activity.types";

/** Quantidade de eventos exibidos no mini-feed de atividade do ambiente. */
const ROOM_ACTIVITY_VISIBLE_LIMIT = 8;

/**
 * `GET /rooms/{id}/events` — eventos já filtrados no back-end pelos
 * dispositivos deste ambiente (ver GetRoomActivityLogQuery.cs), mais
 * recentes primeiro.
 */
export async function fetchRoomActivityLog(
	roomId: string,
): Promise<RoomActivityEntry[]> {
	try {
		const { data } = await apiClient.get<PagedResponse<RoomActivityEntry>>(
			`/rooms/${roomId}/events`,
			{ params: { page: 1, pageSize: ROOM_ACTIVITY_VISIBLE_LIMIT } },
		);
		return data.items ?? [];
	} catch (error: unknown) {
		throw handleApplicationError(
			error,
			"Não foi possível carregar a atividade recente.",
		);
	}
}
