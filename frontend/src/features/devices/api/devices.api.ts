import { apiClient } from "@/core/api/api.client";
import { handleApplicationError } from "@/core/errors/app.errors";
import type { PagedResponse } from "@/core/types/pagination.types";
import type { DevicesListFilters } from "../hooks/devices.keys";
import type {
	CreateDevicePayload,
	CreateDeviceResponse,
	Device,
	DeviceMediaState,
	DeviceTelemetryHistory,
	TelemetryRange,
	ToggleDeviceResponse,
	UpdateDevicePayload,
} from "../types/devices.types";

export type FetchDevicesParams = DevicesListFilters;

/**
 * Fetches registered devices for the authenticated user, filtered and
 * paginated server-side. Normalizes both paginated PagedResponse and
 * direct Array responses into a single PagedResponse shape.
 */
export async function fetchDevices({
	query,
	category,
	status,
	roomId,
	onlyOn,
	page = 1,
	pageSize = 50,
}: FetchDevicesParams = {}): Promise<PagedResponse<Device>> {
	try {
		const { data } = await apiClient.get<PagedResponse<Device> | Device[]>(
			"/devices",
			{
				params: {
					q: query || undefined,
					category: category && category !== "Todos" ? category : undefined,
					status: status || undefined,
					roomId: roomId || undefined,
					onlyOn: onlyOn || undefined,
					page,
					pageSize,
				},
			},
		);

		if (
			data &&
			typeof data === "object" &&
			"items" in data &&
			Array.isArray(data.items)
		) {
			return data;
		}

		const items = Array.isArray(data) ? data : [];

		return {
			items,
			page,
			pageSize,
			totalCount: items.length,
			totalPages: 1,
			hasNextPage: false,
			hasPreviousPage: false,
		};
	} catch (error: unknown) {
		throw handleApplicationError(
			error,
			"Não foi possível carregar a lista de dispositivos.",
		);
	}
}

/**
 * Fetches the details of a specific device by its unique identifier.
 */
export async function fetchDeviceById(id: string): Promise<Device> {
	try {
		const { data } = await apiClient.get<Device>(`/devices/${id}`);
		return data;
	} catch (error: unknown) {
		throw handleApplicationError(
			error,
			"Não foi possível encontrar os detalhes do dispositivo solicitado.",
		);
	}
}

/**
 * Sends a request to register a new IoT hardware.
 */
export async function createDeviceRequest(
	payload: CreateDevicePayload,
): Promise<CreateDeviceResponse> {
	try {
		const { data } = await apiClient.post<CreateDeviceResponse>(
			"/devices",
			payload,
		);
		return data;
	} catch (error: unknown) {
		throw handleApplicationError(
			error,
			"Falha ao tentar cadastrar o novo dispositivo.",
		);
	}
}

/**
 * Sends a request to toggle device state (IsOn) & publish MQTT message.
 */
export async function toggleDeviceRequest(
	deviceId: string,
): Promise<ToggleDeviceResponse> {
	try {
		const { data } = await apiClient.post<ToggleDeviceResponse>(
			`/devices/${deviceId}/toggle`,
		);
		return data;
	} catch (error: unknown) {
		throw handleApplicationError(
			error,
			"Não foi possível alternar o estado do dispositivo.",
		);
	}
}

/**
 * Updates metadata or reallocates the room of an existing device.
 */
export async function updateDeviceRequest({
	id,
	payload,
}: {
	id: string;
	payload: UpdateDevicePayload;
}): Promise<Partial<Device>> {
	try {
		const { data } = await apiClient.put<Partial<Device>>(
			`/devices/${id}`,
			payload,
		);
		return data;
	} catch (error: unknown) {
		throw handleApplicationError(
			error,
			"Não foi possível atualizar as informações do dispositivo.",
		);
	}
}

/**
 * Performs a logical deletion (Soft Delete) of a device by its ID.
 */
export async function deleteDeviceRequest(deviceId: string): Promise<void> {
	try {
		await apiClient.delete(`/devices/${deviceId}`);
	} catch (error: unknown) {
		throw handleApplicationError(
			error,
			"Não foi possível remover o dispositivo selecionado.",
		);
	}
}

/**
 * Starts a network scan for the Device Discovery engine (REST fallback for
 * when the SignalR Hub method invocation isn't available). Results are
 * notified exclusively via the "DeviceDiscovered" SignalR event.
 */
export async function startDeviceDiscoveryRequest(
	timeoutSeconds = 30,
): Promise<void> {
	try {
		await apiClient.post("/devices/discovery/start", { timeoutSeconds });
	} catch (error: unknown) {
		throw handleApplicationError(
			error,
			"Não foi possível iniciar a busca por dispositivos.",
		);
	}
}

/**
 * Stops an in-progress Device Discovery scan (REST fallback).
 */
export async function stopDeviceDiscoveryRequest(): Promise<void> {
	try {
		await apiClient.post("/devices/discovery/stop");
	} catch (error: unknown) {
		throw handleApplicationError(
			error,
			"Não foi possível interromper a busca por dispositivos.",
		);
	}
}

/**
 * Fetches the live volume and now-playing media state of a TV (ADB-backed,
 * GoogleCast/AndroidTvAdb only).
 */
export async function getDeviceMediaStateRequest(
	deviceId: string,
): Promise<DeviceMediaState> {
	try {
		const { data } = await apiClient.get<DeviceMediaState>(
			`/devices/${deviceId}/media`,
		);
		return data;
	} catch (error: unknown) {
		throw handleApplicationError(
			error,
			"Não foi possível carregar o estado de mídia da TV.",
		);
	}
}

/**
 * Sets the TV's volume (0-100%), converted server-side to the real
 * absolute stream level via ADB.
 */
export async function setDeviceVolumeRequest({
	deviceId,
	volume,
}: {
	deviceId: string;
	volume: number;
}): Promise<void> {
	try {
		await apiClient.put(`/devices/${deviceId}/volume`, { volume });
	} catch (error: unknown) {
		throw handleApplicationError(
			error,
			"Não foi possível ajustar o volume da TV.",
		);
	}
}

/**
 * Fetches historical telemetry data points (power usage, temperature, voltage) for a specific device.
 */
export async function getDeviceTelemetryHistoryRequest({
	id,
	range = "24h",
}: {
	id: string;
	range?: TelemetryRange;
}): Promise<DeviceTelemetryHistory> {
	try {
		const { data } = await apiClient.get<DeviceTelemetryHistory>(
			`/devices/${id}/telemetry`,
			{
				params: { range },
			},
		);
		return data;
	} catch (error: unknown) {
		throw handleApplicationError(
			error,
			"Não foi possível carregar o histórico de telemetria do dispositivo.",
		);
	}
}
