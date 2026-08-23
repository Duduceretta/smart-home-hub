import { apiClient } from "@/core/api/api.client";
import { handleApplicationError } from "@/core/errors/app.errors";
import type {
	ClearMockHouseResponse,
	EmitTelemetryPayload,
	SeedMockHouseResponse,
	ToggleConnectivityPayload,
} from "../types/dev.types";

/**
 * Triggers the generation of a mock house (rooms + devices) for the
 * authenticated user, for testing without physical hardware.
 */
export async function seedMockHouseRequest(): Promise<SeedMockHouseResponse> {
	try {
		const { data } = await apiClient.post<SeedMockHouseResponse>(
			"/dev/seed-mock-house",
		);
		return data;
	} catch (error: unknown) {
		throw handleApplicationError(
			error,
			"Falha ao gerar a casa mock de testes.",
		);
	}
}

/**
 * Removes every room/device previously created by seedMockHouseRequest,
 * identified server-side by the mock ExternalId prefix / room name suffix.
 */
export async function clearMockHouseRequest(): Promise<ClearMockHouseResponse> {
	try {
		const { data } = await apiClient.post<ClearMockHouseResponse>(
			"/dev/clear-mock-house",
		);
		return data;
	} catch (error: unknown) {
		throw handleApplicationError(
			error,
			"Falha ao remover a casa mock de testes.",
		);
	}
}

/**
 * Emits simulated telemetry for a device, exercising the same processing
 * pipeline as a real MQTT message.
 */
export async function emitTelemetryRequest(
	payload: EmitTelemetryPayload,
): Promise<{ message: string }> {
	try {
		const { data } = await apiClient.post<{ message: string }>(
			"/dev/emit-telemetry",
			payload,
		);
		return data;
	} catch (error: unknown) {
		throw handleApplicationError(
			error,
			"Falha ao emitir a telemetria simulada.",
		);
	}
}

/**
 * Forces a device's online/offline status, for testing frontend resilience
 * to connectivity changes.
 */
export async function toggleConnectivityRequest(
	payload: ToggleConnectivityPayload,
): Promise<{ message: string }> {
	try {
		const { data } = await apiClient.post<{ message: string }>(
			"/dev/toggle-connectivity",
			payload,
		);
		return data;
	} catch (error: unknown) {
		throw handleApplicationError(
			error,
			"Falha ao alterar a conectividade do dispositivo.",
		);
	}
}
