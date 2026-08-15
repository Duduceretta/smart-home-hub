import { apiClient } from "@/core/api/api.client";
import { handleApplicationError } from "@/core/errors/app.errors";
import type { PagedResponse } from "@/core/types/pagination.types";
import type {
	CreateDeviceGroupPayload,
	CreateDeviceGroupResponse,
	DeviceGroup,
	UpdateDeviceGroupPayload,
	UpdateDeviceGroupResponse,
} from "../types/device-groups.types";

/**
 * Fetches all device groups owned by the authenticated user.
 * Supports both paginated PagedResponse and direct Array responses.
 */
export async function fetchDeviceGroups(
	page = 1,
	pageSize = 10,
): Promise<DeviceGroup[]> {
	try {
		const { data } = await apiClient.get<
			PagedResponse<DeviceGroup> | DeviceGroup[]
		>("/device-groups", {
			params: { page, pageSize },
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
			"Não foi possível carregar a lista de grupos de dispositivos.",
		);
	}
}

/**
 * Fetches the details of a specific device group by its unique identifier.
 */
export async function fetchDeviceGroupById(id: string): Promise<DeviceGroup> {
	try {
		const { data } = await apiClient.get<DeviceGroup>(`/device-groups/${id}`);
		return data;
	} catch (error: unknown) {
		throw handleApplicationError(
			error,
			"Não foi possível encontrar os detalhes do grupo solicitado.",
		);
	}
}

/**
 * Sends a request to create a new device group.
 */
export async function createDeviceGroupRequest(
	payload: CreateDeviceGroupPayload,
): Promise<CreateDeviceGroupResponse> {
	try {
		const { data } = await apiClient.post<CreateDeviceGroupResponse>(
			"/device-groups",
			payload,
		);
		return data;
	} catch (error: unknown) {
		throw handleApplicationError(
			error,
			"Falha ao tentar cadastrar o novo grupo de dispositivos.",
		);
	}
}

/**
 * Updates the name, icon and linked devices of an existing device group.
 */
export async function updateDeviceGroupRequest({
	id,
	payload,
}: {
	id: string;
	payload: UpdateDeviceGroupPayload;
}): Promise<UpdateDeviceGroupResponse> {
	try {
		const { data } = await apiClient.put<UpdateDeviceGroupResponse>(
			`/device-groups/${id}`,
			payload,
		);
		return data;
	} catch (error: unknown) {
		throw handleApplicationError(
			error,
			"Não foi possível atualizar o grupo de dispositivos.",
		);
	}
}

/**
 * Performs a logical deletion (Soft Delete) of a device group by its ID.
 * Devices linked to the group are unlinked, not deleted.
 */
export async function deleteDeviceGroupRequest(id: string): Promise<void> {
	try {
		await apiClient.delete(`/device-groups/${id}`);
	} catch (error: unknown) {
		throw handleApplicationError(
			error,
			"Não foi possível remover o grupo de dispositivos selecionado.",
		);
	}
}
