import { apiClient } from "@/core/api/api.client";
import { handleApplicationError } from "@/core/errors/app.errors";
import type { RoomBulkPowerResult } from "../types/room-power.types";

/**
 * `POST /rooms/{id}/devices/turn-on|turn-off` — liga/desliga em lote todo
 * dispositivo atuador online do ambiente que ainda não está no estado
 * desejado (ver SetRoomDevicesPowerCommand.cs no back-end).
 */
export async function setRoomDevicesPowerRequest(
	roomId: string,
	desiredState: boolean,
): Promise<RoomBulkPowerResult> {
	try {
		const path = desiredState ? "turn-on" : "turn-off";
		const { data } = await apiClient.post<RoomBulkPowerResult>(
			`/rooms/${roomId}/devices/${path}`,
		);
		return data;
	} catch (error: unknown) {
		throw handleApplicationError(
			error,
			"Não foi possível executar a ação em massa neste ambiente.",
		);
	}
}
