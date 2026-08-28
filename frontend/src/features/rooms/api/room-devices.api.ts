import { apiClient } from "@/core/api/api.client";
import { handleApplicationError } from "@/core/errors/app.errors";
import type { PagedResponse } from "@/core/types/pagination.types";
import type {
	RoomDeviceAssignmentPayload,
	RoomPickerDevice,
} from "../types/room-devices.types";

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
