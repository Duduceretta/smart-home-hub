import { apiClient } from "@/core/api/api.client";
import { handleApplicationError } from "@/core/errors/app.errors";
import type { RoomClimate } from "../types/room-climate.types";

/** `GET /rooms/{id}/climate` — última leitura de temperatura/umidade do ambiente. */
export async function fetchRoomClimate(roomId: string): Promise<RoomClimate> {
	try {
		const { data } = await apiClient.get<RoomClimate>(
			`/rooms/${roomId}/climate`,
		);
		return data;
	} catch (error: unknown) {
		throw handleApplicationError(
			error,
			"Não foi possível carregar a leitura de clima do ambiente.",
		);
	}
}
