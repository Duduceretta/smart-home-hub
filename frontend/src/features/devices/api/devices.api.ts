import { apiClient } from "@/core/api/api.client";
import { handleApplicationError } from "@/core/errors/app.errors";
import type { PagedResponse } from "@/core/types/pagination.types";
import type { DevicesListFilters } from "../hooks/devices.keys";
import type {
	CreateDevicePayload,
	CreateDeviceResponse,
	Device,
	DeviceActivityEntry,
	DeviceEnergy,
	DeviceEnergyRange,
	DeviceLinkedAutomation,
	DeviceMediaState,
	DeviceTelemetryHistory,
	DeviceWorkMode,
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
 * Sets a Tuya-local light's brightness (0-100%), converted server-side to
 * the device's real DP scale.
 */
export async function setDeviceBrightnessRequest({
	deviceId,
	brightnessPercent,
}: {
	deviceId: string;
	brightnessPercent: number;
}): Promise<void> {
	try {
		await apiClient.put(`/devices/${deviceId}/brightness`, {
			brightnessPercent,
		});
	} catch (error: unknown) {
		throw handleApplicationError(
			error,
			"Não foi possível ajustar o brilho do dispositivo.",
		);
	}
}

/**
 * Sets a Tuya-local light's color (hex "#RRGGBB"), converted server-side to
 * the device's real HSV DP payload.
 */
export async function setDeviceColorRequest({
	deviceId,
	colorHex,
}: {
	deviceId: string;
	colorHex: string;
}): Promise<void> {
	try {
		await apiClient.put(`/devices/${deviceId}/color`, { colorHex });
	} catch (error: unknown) {
		throw handleApplicationError(
			error,
			"Não foi possível ajustar a cor do dispositivo.",
		);
	}
}

/**
 * Sets a Tuya-local light's color temperature (0-100%, 0=warm/100=cool),
 * converted server-side to the device's real DP scale. Forces the device
 * into white mode server-side.
 */
export async function setDeviceColorTempRequest({
	deviceId,
	colorTempPercent,
}: {
	deviceId: string;
	colorTempPercent: number;
}): Promise<void> {
	try {
		await apiClient.put(`/devices/${deviceId}/color-temp`, {
			colorTempPercent,
		});
	} catch (error: unknown) {
		throw handleApplicationError(
			error,
			"Não foi possível ajustar a temperatura de cor do dispositivo.",
		);
	}
}

/**
 * Switches a Tuya-local light's work_mode ("white"/"colour") for real —
 * backs the Branco/Cor tabs in the control panel.
 */
export async function setDeviceWorkModeRequest({
	deviceId,
	workMode,
}: {
	deviceId: string;
	workMode: "white" | "colour";
}): Promise<void> {
	try {
		await apiClient.put(`/devices/${deviceId}/work-mode`, { workMode });
	} catch (error: unknown) {
		throw handleApplicationError(
			error,
			"Não foi possível trocar o modo do dispositivo.",
		);
	}
}

/**
 * Reads the light's current work_mode live from the hardware — used to
 * open the control panel already on the right tab (Branco/Cor).
 */
export async function fetchDeviceWorkMode(
	deviceId: string,
): Promise<DeviceWorkMode> {
	try {
		const { data } = await apiClient.get<{ workMode: DeviceWorkMode }>(
			`/devices/${deviceId}/work-mode`,
		);
		return data.workMode;
	} catch (error: unknown) {
		throw handleApplicationError(
			error,
			"Não foi possível consultar o modo atual do dispositivo.",
		);
	}
}

/**
 * Quantidade de eventos exibidos no mini-feed de atividade do dispositivo
 * (mesmo limite de `ROOM_ACTIVITY_VISIBLE_LIMIT` na feature `rooms`).
 */
const DEVICE_ACTIVITY_VISIBLE_LIMIT = 8;

/**
 * `GET /devices/{id}/energy` — consumo do dispositivo, em baldes de 5min.
 */
export async function fetchDeviceEnergy(
	deviceId: string,
	range: DeviceEnergyRange,
): Promise<DeviceEnergy> {
	try {
		const { data } = await apiClient.get<DeviceEnergy>(
			`/devices/${deviceId}/energy`,
			{ params: { range } },
		);
		return data;
	} catch (error: unknown) {
		throw handleApplicationError(
			error,
			"Não foi possível carregar o consumo de energia do dispositivo.",
		);
	}
}

/**
 * `GET /devices/{id}/automations` — automações cujo gatilho/condição/ação
 * referenciam este dispositivo. Cruzamento feito no back-end (ver
 * GetDeviceAutomationsQuery.cs).
 */
export async function fetchDeviceAutomations(
	deviceId: string,
): Promise<DeviceLinkedAutomation[]> {
	try {
		const { data } = await apiClient.get<DeviceLinkedAutomation[]>(
			`/devices/${deviceId}/automations`,
		);
		return data;
	} catch (error: unknown) {
		throw handleApplicationError(
			error,
			"Não foi possível carregar as automações vinculadas.",
		);
	}
}

/**
 * `GET /devices/{id}/events` — eventos já filtrados no back-end por este
 * dispositivo (ver GetDeviceActivityLogQuery.cs), mais recentes primeiro.
 */
export async function fetchDeviceActivityLog(
	deviceId: string,
): Promise<DeviceActivityEntry[]> {
	try {
		const { data } = await apiClient.get<PagedResponse<DeviceActivityEntry>>(
			`/devices/${deviceId}/events`,
			{ params: { page: 1, pageSize: DEVICE_ACTIVITY_VISIBLE_LIMIT } },
		);
		return data.items ?? [];
	} catch (error: unknown) {
		throw handleApplicationError(
			error,
			"Não foi possível carregar a atividade recente.",
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
