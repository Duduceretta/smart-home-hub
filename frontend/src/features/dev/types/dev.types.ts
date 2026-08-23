/**
 * Response structure from C# POST /api/dev/seed-mock-house.
 */
export interface SeedMockHouseResponse {
	roomsCreated: number;
	devicesCreated: number;
	errors: string[];
}

/**
 * Response structure from C# POST /api/dev/clear-mock-house.
 */
export interface ClearMockHouseResponse {
	devicesRemoved: number;
	roomsRemoved: number;
}

/**
 * Payload sent to POST /api/dev/emit-telemetry (EmitTelemetryRequest in C#).
 */
export interface EmitTelemetryPayload {
	deviceId: string;
	isOn: boolean;
	powerUsageWatts?: number | null;
	temperatureCelsius?: number | null;
	voltage?: number | null;
	signalStrength?: string | null;
}

/**
 * Payload sent to POST /api/dev/toggle-connectivity (ToggleConnectivityRequest in C#).
 */
export interface ToggleConnectivityPayload {
	deviceId: string;
	isOnline: boolean;
}
