import { apiClient } from "@/core/api/api.client";
import { handleApplicationError } from "@/core/errors/app.errors";
import type { PagedResponse } from "@/core/types/pagination.types";
import type {
	CreateRoomPayload,
	Room,
	UpdateRoomPayload,
} from "../types/rooms.types";

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
