import { apiClient } from "@/core/api/api.client";
import type { PagedResponse } from "@/core/types/pagination.types";
import type {
	CreateDevicePayload,
	CreateDeviceResponse,
	Device,
	UpdateDevicePayload,
} from "../types/devices.types";

export async function fetchDevices(): Promise<Device[]> {
	const { data } = await apiClient.get<PagedResponse<Device> | Device[]>(
		"/devices",
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
}

export const fetchDeviceById = async (id: string): Promise<Device> => {
	const { data } = await apiClient.get<Device>(`/devices/${id}`);
	return data;
};

export async function createDeviceRequest(
	payload: CreateDevicePayload,
): Promise<CreateDeviceResponse> {
	const { data } = await apiClient.post<CreateDeviceResponse>(
		"/devices",
		payload,
	);
	return data;
}

export const toggleDeviceRequest = async (
	deviceId: string,
): Promise<{ message: string }> => {
	const { data } = await apiClient.post<{ message: string }>(
		`/devices/${deviceId}/toggle`,
	);
	return data;
};

export const updateDeviceRequest = async ({
	id,
	payload,
}: {
	id: string;
	payload: UpdateDevicePayload;
}): Promise<Device> => {
	const { data } = await apiClient.put<Device>(`/devices/${id}`, payload);
	return data;
};

export const deleteDeviceRequest = async (deviceId: string): Promise<void> => {
	await apiClient.delete(`/devices/${deviceId}`);
};
