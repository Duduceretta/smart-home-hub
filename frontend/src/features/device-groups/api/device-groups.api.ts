import { apiClient } from "@/core/api/api.client";
import { handleApplicationError } from "@/core/errors/app.errors";
import type { PagedResponse } from "@/core/types/pagination.types";
import type {
	CreateDeviceGroupPayload,
	CreateDeviceGroupResponse,
	DeviceGroup,
	DeviceGroupBulkPowerResult,
	DeviceInGroup,
	UpdateDeviceGroupPayload,
	UpdateDeviceGroupResponse,
} from "../types/device-groups.types";

/**
 * Fetches all device groups owned by the authenticated user.
 * Supports both paginated PagedResponse and direct Array responses.
 * Default pageSize is set to 200 for the master-detail panel.
 */
export async function fetchDeviceGroups(
	page = 1,
	pageSize = 200,
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

/**
 * `POST /devices/{id}/toggle` — inverts the physical on/off state of a device
 * inside the group (FSD: encapsulated within this feature's api layer).
 */
export async function toggleDeviceGroupDeviceRequest(
	deviceId: string,
): Promise<void> {
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
 * Toggles all eligible devices in a group to a desired state (on or off) concurrently.
 */
export async function setDeviceGroupBulkPowerRequest(
	devices: DeviceInGroup[],
	desiredState: boolean,
): Promise<DeviceGroupBulkPowerResult> {
	const targetDevices = devices.filter((d) => d.isOn !== desiredState);

	if (targetDevices.length === 0) {
		return { succeededCount: 0, failedCount: 0, totalCount: 0 };
	}

	const results = await Promise.allSettled(
		targetDevices.map((device) =>
			apiClient.post(`/devices/${device.id}/toggle`),
		),
	);

	const succeededCount = results.filter((r) => r.status === "fulfilled").length;
	const failedCount = results.filter((r) => r.status === "rejected").length;

	return {
		succeededCount,
		failedCount,
		totalCount: targetDevices.length,
	};
}
