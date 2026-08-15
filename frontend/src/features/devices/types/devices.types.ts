/**
 * DeviceType mapping matching C# backend enum integers.
 */
export const DeviceTypeEnum = {
	Light: 1,
	Switch: 2,
	Sensor: 3,
	Thermostat: 4,
	Camera: 5,
	Lock: 6,
	Alarm: 7,
	Television: 8,
} as const;

export type DeviceTypeEnum =
	(typeof DeviceTypeEnum)[keyof typeof DeviceTypeEnum];

/**
 * Maps each device type to its i18n key (under the `devices` namespace's
 * `types` object) for UI rendering across supported locales.
 */
export const DEVICE_TYPE_LABEL_KEYS = {
	[DeviceTypeEnum.Light]: "types.light",
	[DeviceTypeEnum.Switch]: "types.switch",
	[DeviceTypeEnum.Sensor]: "types.sensor",
	[DeviceTypeEnum.Thermostat]: "types.thermostat",
	[DeviceTypeEnum.Camera]: "types.camera",
	[DeviceTypeEnum.Lock]: "types.lock",
	[DeviceTypeEnum.Alarm]: "types.alarm",
	[DeviceTypeEnum.Television]: "types.television",
} as const satisfies Record<DeviceTypeEnum, string>;

export type StatusFilterType = "online" | "offline" | null;

/**
 * Represents the Device DTO returned by C# GetDevicesQuery / GetDeviceByIdQuery.
 */
export interface Device {
	id: string;
	name: string;
	brand: string;
	externalId: string;
	ipAddress: string | null;
	type: DeviceTypeEnum;
	category: string;
	room: string;
	roomId: string | null;
	isOnline: boolean;
	isOn: boolean;
	lastActivityMinutes: number;
}

/**
 * Payload sent to POST /api/devices (CreateDeviceRequest in C#).
 */
export interface CreateDevicePayload {
	name: string;
	brand: string;
	externalId: string;
	ipAddress?: string | null;
	type: DeviceTypeEnum;
	roomId?: string | null;
}

/**
 * Payload sent to PUT /api/devices/{id} (UpdateDeviceRequest in C#).
 */
export interface UpdateDevicePayload {
	name: string;
	brand: string;
	externalId: string;
	ipAddress?: string | null;
	type: DeviceTypeEnum;
	roomId?: string | null;
}

/**
 * Response structure from C# POST /api/devices.
 */
export interface CreateDeviceResponse {
	message: string;
	deviceId: string;
}

/**
 * Response structure from C# POST /api/devices/{id}/toggle.
 */
export interface ToggleDeviceResponse {
	message: string;
}

/**
 * Helper function to verify if a device supports state toggling (ON/OFF).
 */
export function isActuatorDevice(type: DeviceTypeEnum): boolean {
	return (
		type === DeviceTypeEnum.Light ||
		type === DeviceTypeEnum.Switch ||
		type === DeviceTypeEnum.Thermostat ||
		type === DeviceTypeEnum.Lock ||
		type === DeviceTypeEnum.Alarm ||
		type === DeviceTypeEnum.Television
	);
}

export type TelemetryRange = "24h" | "7d" | "30d";

export interface DeviceTelemetryPoint {
	timestamp: string;
	powerUsageWatts: number | null;
	temperatureCelsius: number | null;
	voltage: number | null;
	isOn: boolean;
}

export interface DeviceTelemetryHistory {
	deviceId: string;
	deviceName: string;
	points: DeviceTelemetryPoint[];
}
