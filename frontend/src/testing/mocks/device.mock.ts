import {
	type Device,
	DeviceTypeEnum,
} from "@/features/devices/types/devices.types";

export function createDeviceMock(overrides?: Partial<Device>): Device {
	const defaultMock: Device = {
		id: "device-test-123",
		name: "Lâmpada Inteligente",
		externalId: "00:11:22:33:44:55",
		brand: "Philips Hue",
		type: DeviceTypeEnum.Light,
		category: "Lighting",
		room: "Sala de Estar",
		roomId: "room-01",
		ipAddress: "192.168.1.100",
		isOnline: true,
		isOn: false,
		lastActivityMinutes: 5,
	};

	return {
		...defaultMock,
		...overrides,
	};
}
