import { apiClient } from "@/core/api/api.client";
import { handleApplicationError } from "@/core/errors/app.errors";
import type { PagedResponse } from "@/core/types/pagination.types";
import type { PickerDevice } from "../types/device-groups.types";

/**
 * Fetches a large-enough page of the user's devices to populate the
 * device-group picker. Kept separate from the devices feature (FSD isolation)
 * and from device-groups.api.ts to keep the "picker data source" concern
 * visually distinct from the group's own CRUD API.
 */
export async function fetchPickerDevices(): Promise<PickerDevice[]> {
	try {
		const { data } = await apiClient.get<
			PagedResponse<PickerDevice> | PickerDevice[]
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
