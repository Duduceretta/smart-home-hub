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
 * IntegrationType mapping matching C# backend enum integers
 * (backend/src/SmartHomeHub.Domain/Enums/IntegrationType.cs).
 */
export const IntegrationTypeEnum = {
	NativeMqtt: 1,
	TuyaBridge: 2,
	LgWebOs: 3,
	GoogleCast: 4,
	Zigbee: 5,
	MdnsZeroconf: 6,
	SsdpUpnp: 7,
	TuyaLocal: 8,
	EspHomeMqtt: 9,
	AndroidTvAdb: 10,
} as const;

export type IntegrationTypeEnum =
	(typeof IntegrationTypeEnum)[keyof typeof IntegrationTypeEnum];

/**
 * Maps each integration type to its i18n key (under the `devices` namespace's
 * `types.integrationTypes` object) for UI rendering across supported locales.
 */
export const INTEGRATION_TYPE_LABEL_KEYS = {
	[IntegrationTypeEnum.NativeMqtt]: "types.integrationTypes.nativeMqtt",
	[IntegrationTypeEnum.TuyaBridge]: "types.integrationTypes.tuyaBridge",
	[IntegrationTypeEnum.LgWebOs]: "types.integrationTypes.lgWebOs",
	[IntegrationTypeEnum.GoogleCast]: "types.integrationTypes.googleCast",
	[IntegrationTypeEnum.Zigbee]: "types.integrationTypes.zigbee",
	[IntegrationTypeEnum.MdnsZeroconf]: "types.integrationTypes.mdnsZeroconf",
	[IntegrationTypeEnum.SsdpUpnp]: "types.integrationTypes.ssdpUpnp",
	[IntegrationTypeEnum.TuyaLocal]: "types.integrationTypes.tuyaLocal",
	[IntegrationTypeEnum.EspHomeMqtt]: "types.integrationTypes.espHomeMqtt",
	[IntegrationTypeEnum.AndroidTvAdb]: "types.integrationTypes.androidTvAdb",
} as const satisfies Record<IntegrationTypeEnum, string>;

/**
 * Represents the Device DTO returned by C# GetDevicesQuery / GetDeviceByIdQuery.
 * Note: only `ipAddress` is exposed for reading out of the backend's
 * `DeviceConfiguration` value object — `macAddress`/`localKey`/`dpsPowerKey`/
 * `clientKey` are write-only (Create/Update requests only, never returned).
 */
export interface Device {
	id: string;
	name: string;
	brand: string;
	externalId: string;
	ipAddress: string | null;
	type: DeviceTypeEnum;
	integrationType: IntegrationTypeEnum;
	category: string;
	room: string;
	roomId: string | null;
	isOnline: boolean;
	isOn: boolean;
	lastActivityMinutes: number;
	/** Já "achatado" (override manual ?? detecção automática) — usar pra mostrar/esconder o seletor de cor. */
	supportsColor: boolean;
	/** Cru (null = detecção automática, true/false = override manual) — usar só pra pré-preencher o EditDeviceModal. */
	supportsColorOverride: boolean | null;
}

/**
 * Payload sent to POST /api/devices (CreateDeviceRequest in C#).
 */
export interface CreateDevicePayload {
	name: string;
	brand: string;
	externalId: string;
	type: DeviceTypeEnum;
	integrationType: IntegrationTypeEnum;
	roomId?: string | null;
	ipAddress?: string | null;
	macAddress?: string | null;
	localKey?: string | null;
	protocolVersion?: string | null;
	dpsPowerKey?: string | null;
	clientKey?: string | null;
	supportsColor?: boolean | null;
}

/**
 * Payload sent to PUT /api/devices/{id} (UpdateDeviceRequest in C#).
 * Sensitive/network fields left empty are preserved server-side, not wiped
 * (the GET response never returns them, so the edit form can't pre-fill them).
 */
export interface UpdateDevicePayload {
	name: string;
	brand: string;
	externalId: string;
	type: DeviceTypeEnum;
	integrationType: IntegrationTypeEnum;
	roomId?: string | null;
	ipAddress?: string | null;
	macAddress?: string | null;
	localKey?: string | null;
	protocolVersion?: string | null;
	dpsPowerKey?: string | null;
	clientKey?: string | null;
	supportsColor?: boolean | null;
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

/** Espelha o work_mode real do DP21 Tuya — null = não foi possível ler (offline/sem DP). */
export type DeviceWorkMode = "white" | "colour" | null;

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

/**
 * Real volume/now-playing state of a TV, read live via ADB
 * (DeviceMediaStateDto in C#). Only GoogleCast/AndroidTvAdb devices
 * support this — see IntegrationTypeExtensions.IsAdbControllable.
 */
export interface DeviceMediaState {
	volumePercent: number;
	isPlaying: boolean;
	title: string | null;
	artist: string | null;
}

/**
 * Payload of the SignalR "DeviceDiscovered" event (DiscoveredDeviceDto in C#,
 * camelCase — JsonHubProtocol default). `signalStrength` is almost always
 * null today: none of the current backend scanners populate it.
 */
export interface DiscoveredDevice {
	temporaryId: string;
	name: string;
	brand: string;
	externalId: string;
	type: DeviceTypeEnum;
	integrationType: IntegrationTypeEnum;
	ipAddress: string | null;
	macAddress: string | null;
	signalStrength: number | null;
	additionalProperties: Record<string, string> | null;
	/**
	 * SSDP only: root devices/serviços UPnP individuais agrupados sob este
	 * dispositivo físico (ex: DIAL, AVTransport) — preservado para ações de
	 * controle futuras que precisem do endpoint/Location específico. Não
	 * renderizado na UI ainda.
	 */
	upnpServices: UpnpServiceInfo[] | null;
}

export interface UpnpServiceInfo {
	usn: string | null;
	searchTarget: string | null;
	location: string | null;
}

export type DeviceEnergyRange = "24h" | "7d";

/**
 * Espelha `DeviceEnergyChartPointDto`/`DeviceEnergyResponseDto` (C#,
 * GetDeviceEnergyQuery.cs). `value` é potência MÉDIA (kW) do balde de
 * 5min deste dispositivo — mesmo shape de `RoomEnergy` na feature `rooms`,
 * duplicado localmente por isolamento do FSD.
 */
export interface DeviceEnergyChartPoint {
	timestamp: string;
	value: number;
	isEstimated: boolean;
}

export interface DeviceEnergy {
	hasEnergyData: boolean;
	chart: DeviceEnergyChartPoint[];
	totalConsumptionKwh: number;
	isEnergyEstimated: boolean;
	/** false = este dispositivo nunca reportou potência (sem hardware de medição) — mensagem diferente de "sem dado no período". */
	measuresPower: boolean;
}

export type DeviceAutomationTriggerKind = "schedule" | "sensor" | "unknown";

/**
 * Espelha `DeviceAutomationDto` (GetDeviceAutomationsQuery.cs) — o
 * cruzamento com as automações que referenciam este dispositivo já vem
 * pronto do back-end.
 */
export interface DeviceLinkedAutomation {
	id: string;
	name: string;
	isActive: boolean;
	triggerKind: DeviceAutomationTriggerKind;
}

/**
 * Formato mínimo de evento de atividade filtrado por dispositivo — espelha
 * `ActivityLogEntry` da feature `dashboard` (isolamento do FSD, mesmo
 * padrão de `RoomActivityEntry` na feature `rooms`).
 */
export interface DeviceActivityEntry {
	id: string;
	deviceId: string | null;
	eventType:
		| "DeviceStatus"
		| "DeviceMedia"
		| "Spotify"
		| "AutomationExecuted"
		| string;
	title: string;
	description: string;
	timestamp: string;
	isAlert: boolean;
}
