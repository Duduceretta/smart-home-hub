export enum DeviceTypeEnum {
	Light = 1,
	Switch = 2,
	Sensor = 3,
	Thermostat = 4,
	Camera = 5,
	Lock = 6,
	Alarm = 7,
	Television = 8,
}

export type StatusFilterType = "online" | "offline" | null;

export interface Device {
	id: string;
	name: string;
	brand: string;
	externalId: string;
	ipAddress?: string | null;
	type: DeviceTypeEnum;
	category: string;
	room: string;
	roomId?: string | null;
	isOnline: boolean;
	isOn: boolean;
	lastActivityMinutes?: number;
}

export interface CreateDevicePayload {
	name: string;
	brand: string;
	externalId: string;
	ipAddress?: string | null;
	type: DeviceTypeEnum;
	roomId: string | null;
}

export interface CreateDeviceResponse {
	message: string;
	deviceId: string;
}

export function isActuatorDevice(type: DeviceTypeEnum): boolean {
	return [
		DeviceTypeEnum.Light,
		DeviceTypeEnum.Switch,
		DeviceTypeEnum.Thermostat,
		DeviceTypeEnum.Lock,
		DeviceTypeEnum.Alarm,
		DeviceTypeEnum.Television,
	].includes(type);
}

export interface UpdateDevicePayload {
	name: string;
	brand: string;
	externalId: string;
	ipAddress?: string | null;
	type: DeviceTypeEnum;
	roomId?: string | null;
}

export interface ToggleDeviceResponse {
	message: string;
}
