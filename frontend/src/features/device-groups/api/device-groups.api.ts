import { apiClient } from "@/core/api/api.client";
import { handleApplicationError } from "@/core/errors/app.errors";
import type { PagedResponse } from "@/core/types/pagination.types";
import type {
	CreateDeviceGroupPayload,
	CreateDeviceGroupResponse,
	DeviceGroup,
	DeviceGroupBulkPowerResult,
	DeviceGroupLinkedAutomation,
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
 * `POST /devices/{id}/toggle` — inverts the physical on/off state of a single device
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
 * `POST /device-groups/{groupId}/devices/turn-on` or `turn-off` —
 * Server-side command executing bulk power switch for all eligible actuator devices in the group.
 */
export async function setDeviceGroupPowerRequest(
	groupId: string,
	desiredState: boolean,
): Promise<DeviceGroupBulkPowerResult> {
	try {
		const action = desiredState ? "turn-on" : "turn-off";
		const { data } = await apiClient.post<DeviceGroupBulkPowerResult>(
			`/device-groups/${groupId}/devices/${action}`,
		);
		return data;
	} catch (error: unknown) {
		throw handleApplicationError(
			error,
			"Não foi possível alternar os dispositivos do grupo no servidor.",
		);
	}
}

/**
 * `PUT /device-groups/{groupId}/devices/brightness` —
 * Server-side command setting brightness level for all online lighting devices in the group.
 */
export async function setDeviceGroupBrightnessRequest(
	groupId: string,
	brightnessPercent: number,
): Promise<void> {
	try {
		await apiClient.put(`/device-groups/${groupId}/devices/brightness`, {
			brightnessPercent,
		});
	} catch (error: unknown) {
		throw handleApplicationError(
			error,
			"Não foi possível ajustar o brilho coletivo do grupo no servidor.",
		);
	}
}

/**
 * `GET /device-groups/{groupId}/automations` —
 * Server-side query fetching automations whose RulePayload references any device in the group.
 */
export async function fetchDeviceGroupAutomations(
	groupId: string,
): Promise<DeviceGroupLinkedAutomation[]> {
	try {
		const { data } = await apiClient.get<DeviceGroupLinkedAutomation[]>(
			`/device-groups/${groupId}/automations`,
		);
		return data;
	} catch (error: unknown) {
		throw handleApplicationError(
			error,
			"Não foi possível carregar as automações vinculadas ao grupo.",
		);
	}
}
