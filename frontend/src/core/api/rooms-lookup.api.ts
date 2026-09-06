import { apiClient } from "@/core/api/api.client";
import { handleApplicationError } from "@/core/errors/app.errors";
import type { PagedResponse } from "@/core/types/pagination.types";
import type { RoomLookupItem } from "@/core/types/room-lookup.types";

/**
 * Minimal read-only room lookup (id/name/icon), hitting the same `GET /rooms`
 * endpoint as `features/rooms/api/rooms.api.ts#fetchRooms` — kept here so
 * `devices`/`dashboard` can resolve room names/icons without importing
 * directly from `features/rooms` (FSD forbids cross-feature imports).
 * `rooms` itself owns the full CRUD surface; this never grows beyond this shape.
 */
export async function fetchRoomLookup(): Promise<RoomLookupItem[]> {
	try {
		const { data } = await apiClient.get<
			PagedResponse<RoomLookupItem> | RoomLookupItem[]
		>("/rooms", { params: { page: 1, pageSize: 200 } });

		if (
			data &&
			typeof data === "object" &&
			"items" in data &&
			Array.isArray(data.items)
		) {
			return data.items;
		}

		return Array.isArray(data) ? data : [];
	} catch (error: unknown) {
		throw handleApplicationError(
			error,
			"Não foi possível carregar a lista de ambientes.",
		);
	}
}
