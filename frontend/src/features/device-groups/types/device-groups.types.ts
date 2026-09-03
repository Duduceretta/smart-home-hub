/**
 * Represents a device summarized inside a DeviceGroupDto (DeviceInGroupDto).
 */
export interface DeviceInGroup {
	id: string;
	name: string;
	brand: string;
	externalId: string;
	type: number;
	isOn: boolean;
	isOnline?: boolean;
}

/**
 * Represents the device-group read-model (DeviceGroupDto)
 * returned by C# API queries.
 */
export interface DeviceGroup {
	id: string;
	name: string;
	icon?: string | null;
	devices: DeviceInGroup[];
	/** Média arredondada do brilho (0-100) das luzes online do grupo que já têm brilho confirmado — null se nenhuma atender aos dois critérios. */
	averageBrightness: number | null;
}

/**
 * Payload required to create a new device group (CreateDeviceGroupRequest).
 */
export interface CreateDeviceGroupPayload {
	name: string;
	icon?: string | null;
	deviceIds: string[];
}

/**
 * Payload required to update an existing device group (UpdateDeviceGroupRequest).
 */
export interface UpdateDeviceGroupPayload {
	name: string;
	icon?: string | null;
	deviceIds: string[];
}

export interface CreateDeviceGroupResponse {
	message: string;
	groupId: string;
}

/**
 * The PUT endpoint echoes back the submitted payload instead of the full
 * DeviceGroupDto (no nested `devices` details) — see DeviceGroupEndpoints.cs:146-154.
 */
export interface UpdateDeviceGroupResponse {
	id: string;
	name: string;
	icon: string | null;
	deviceIds: string[];
}

/**
 * Minimal device shape needed by the group's device picker.
 * Deliberately not the `devices` feature's `Device` type (FSD isolation).
 */
export interface PickerDevice {
	id: string;
	name: string;
	brand: string;
	isOn: boolean;
	isOnline?: boolean;
	type?: number;
}

/**
 * View mode for the device groups left panel list (cards vs compact list).
 */
export type DeviceGroupsViewMode = "cards" | "list";

/**
 * Result of a bulk power command on a device group.
 */
export interface DeviceGroupBulkPowerResult {
	succeededCount: number;
	failedCount: number;
	totalCount: number;
}

export type DeviceGroupAutomationTriggerKind =
	| "schedule"
	| "sensor"
	| "unknown";

export interface DeviceGroupLinkedAutomation {
	id: string;
	name: string;
	isActive: boolean;
	triggerKind: DeviceGroupAutomationTriggerKind;
}
