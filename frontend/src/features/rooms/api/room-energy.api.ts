import { apiClient } from "@/core/api/api.client";
import { handleApplicationError } from "@/core/errors/app.errors";
import type { RoomEnergy, RoomEnergyRange } from "../types/room-energy.types";

/** `GET /rooms/{id}/energy` — consumo agregado do ambiente, em baldes de 5min. */
export async function fetchRoomEnergy(
	roomId: string,
	range: RoomEnergyRange,
): Promise<RoomEnergy> {
	try {
		const { data } = await apiClient.get<RoomEnergy>(
			`/rooms/${roomId}/energy`,
			{ params: { range } },
		);
		return data;
	} catch (error: unknown) {
		throw handleApplicationError(
			error,
			"Não foi possível carregar o consumo de energia do ambiente.",
		);
	}
}
