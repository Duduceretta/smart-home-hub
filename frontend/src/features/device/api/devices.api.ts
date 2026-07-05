import { apiClient } from "@/core/api/api.client";
import type { PagedResponse } from "@/core/types/pagination.types";
import type {
	CreateDevicePayload,
	CreateDeviceResponse,
	Device,
} from "../types/devices.types";

/**
 * Busca a lista de dispositivos e desempacota o PagedResult do C#
 * GET /api/devices
 */
export async function fetchDevices(): Promise<Device[]> {
	const { data } = await apiClient.get<PagedResponse<Device> | Device[]>(
		"/devices",
	);

	// Se o C# devolveu o objeto paginado { items: [...] }, extraímos o array:
	if (
		data &&
		typeof data === "object" &&
		"items" in data &&
		Array.isArray(data.items)
	) {
		return data.items;
	}

	// Se devolveu um array puro:
	if (Array.isArray(data)) {
		return data;
	}

	return [];
}

/**
 * Dispara o comando de inversão de estado (IsOn) via HTTP + MQTT
 * POST /api/devices/{id}/toggle
 */
export async function toggleDeviceRequest(deviceId: string): Promise<unknown> {
	const { data } = await apiClient.post(`/devices/${deviceId}/toggle`);
	return data;
}

/**
 * Registra um novo hardware IoT no banco de dados do .NET
 * POST /api/devices
 */
export async function createDeviceRequest(
	payload: CreateDevicePayload,
): Promise<CreateDeviceResponse> {
	const { data } = await apiClient.post<CreateDeviceResponse>(
		"/devices",
		payload,
	);
	return data;
}
