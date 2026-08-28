import { apiClient } from "@/core/api/api.client";
import { handleApplicationError } from "@/core/errors/app.errors";
import type { RoomLinkedAutomation } from "../types/room-automations.types";

/**
 * `GET /rooms/{id}/automations` — automações cujo gatilho/condição/ação
 * referenciam algum dispositivo deste ambiente. Cruzamento feito no
 * back-end (ver GetRoomAutomationsQuery.cs).
 */
export async function fetchRoomAutomations(
	roomId: string,
): Promise<RoomLinkedAutomation[]> {
	try {
		const { data } = await apiClient.get<RoomLinkedAutomation[]>(
			`/rooms/${roomId}/automations`,
		);
		return data;
	} catch (error: unknown) {
		throw handleApplicationError(
			error,
			"Não foi possível carregar as automações vinculadas.",
		);
	}
}
