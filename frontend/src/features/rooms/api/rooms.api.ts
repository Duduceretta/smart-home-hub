import { apiClient } from "@/core/api/api.client";
import { handleApplicationError } from "@/core/errors/app.errors";
import type { PagedResponse } from "@/core/types/pagination.types";
import type {
	CreateRoomPayload,
	Room,
	RoomActivityEntry,
	RoomBulkPowerResult,
	RoomClimate,
	RoomDeviceAssignmentPayload,
	RoomEnergy,
	RoomEnergyRange,
	RoomLinkedAutomation,
	RoomPickerDevice,
	UpdateRoomPayload,
} from "../types/rooms.types";

// ---------------------------------------------------------------------------
// CRUD de ambiente
// ---------------------------------------------------------------------------

/**
 * Fetches all rooms owned by the authenticated user.
 * Supports both paginated PagedResponse and direct Array responses.
 */
export async function fetchRooms(page = 1, pageSize = 10): Promise<Room[]> {
	try {
		const { data } = await apiClient.get<PagedResponse<Room> | Room[]>(
			"/rooms",
			{
				params: { page, pageSize },
			},
		);

		if (
			data &&
			typeof data === "object" &&
			"items" in data &&
			Array.isArray(data.items)
		) {
			return data.items;
		}

		if (Array.isArray(data)) {
			return data;
		}

		return [];
	} catch (error: unknown) {
		throw handleApplicationError(
			error,
			"Não foi possível carregar a lista de ambientes.",
		);
	}
}

/**
 * Fetches the details of a specific room by its unique identifier.
 */
export async function fetchRoomById(id: string): Promise<Room> {
	try {
		const { data } = await apiClient.get<Room>(`/rooms/${id}`);
		return data;
	} catch (error: unknown) {
		throw handleApplicationError(
			error,
			"Não foi possível encontrar os detalhes do ambiente solicitante.",
		);
	}
}

/**
 * Sends a request to create a new physical room.
 */
export async function createRoomRequest(
	payload: CreateRoomPayload,
): Promise<{ message: string; roomId: string }> {
	try {
		const { data } = await apiClient.post<{ message: string; roomId: string }>(
			"/rooms",
			payload,
		);
		return data;
	} catch (error: unknown) {
		throw handleApplicationError(
			error,
			"Falha ao tentar cadastrar o novo ambiente.",
		);
	}
}

/**
 * Updates the name and icon of an existing room.
 */
export async function updateRoomRequest({
	id,
	payload,
}: {
	id: string;
	payload: UpdateRoomPayload;
}): Promise<Room> {
	try {
		const { data } = await apiClient.put<Room>(`/rooms/${id}`, payload);
		return data;
	} catch (error: unknown) {
		throw handleApplicationError(
			error,
			"Não foi possível atualizar as informações do ambiente.",
		);
	}
}

/**
 * Performs a logical deletion (Soft Delete) of a room by its ID.
 */
export async function deleteRoomRequest(id: string): Promise<void> {
	try {
		await apiClient.delete(`/rooms/${id}`);
	} catch (error: unknown) {
		throw handleApplicationError(
			error,
			"Não foi possível remover o ambiente selecionado.",
		);
	}
}

// ---------------------------------------------------------------------------
// Dispositivos do ambiente (atribuição + toggle)
// ---------------------------------------------------------------------------

/**
 * Fetches a large-enough page of the user's devices to populate the room's
 * device-assignment picker. Kept local to the `rooms` feature (FSD
 * isolation) — same pattern as `device-groups/api/picker-devices.api.ts`.
 */
export async function fetchAssignableDevices(): Promise<RoomPickerDevice[]> {
	try {
		const { data } = await apiClient.get<
			PagedResponse<RoomPickerDevice> | RoomPickerDevice[]
		>("/devices", {
			params: { pageSize: 200 },
		});

		if (
			data &&
			typeof data === "object" &&
			"items" in data &&
			Array.isArray(data.items)
		) {
			return data.items;
		}

		if (Array.isArray(data)) {
			return data;
		}

		return [];
	} catch (error: unknown) {
		throw handleApplicationError(
			error,
			"Não foi possível carregar a lista de dispositivos disponíveis.",
		);
	}
}

/**
 * Reallocates a device to (or away from, when `roomId` is null) a room by
 * updating it through the devices endpoint — Room's own Create/Update
 * commands don't accept a device list, the assignment lives on `Device.RoomId`.
 */
export async function updateDeviceRoomAssignmentRequest({
	id,
	payload,
}: {
	id: string;
	payload: RoomDeviceAssignmentPayload;
}): Promise<void> {
	try {
		await apiClient.put(`/devices/${id}`, payload);
	} catch (error: unknown) {
		throw handleApplicationError(
			error,
			"Não foi possível atualizar a atribuição do dispositivo.",
		);
	}
}

/**
 * Toggles a device's on/off state from within the Rooms screen.
 */
export async function toggleRoomDeviceRequest(deviceId: string): Promise<void> {
	try {
		await apiClient.post(`/devices/${deviceId}/toggle`);
	} catch (error: unknown) {
		throw handleApplicationError(
			error,
			"Não foi possível alternar o estado do dispositivo.",
		);
	}
}

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

// ---------------------------------------------------------------------------
// Clima
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Energia
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Automações vinculadas
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Atividade recente
// ---------------------------------------------------------------------------

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
