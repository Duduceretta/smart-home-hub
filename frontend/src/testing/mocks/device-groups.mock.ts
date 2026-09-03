import type {
	DeviceGroup,
	DeviceInGroup,
	PickerDevice,
} from "@/features/device-groups/types/device-groups.types";

export function createDeviceInGroupMock(
	overrides?: Partial<DeviceInGroup>,
): DeviceInGroup {
	const defaultMock: DeviceInGroup = {
		id: "device-group-dev-01",
		name: "Lâmpada do Teto",
		brand: "Tuya",
		externalId: "AA:BB:CC:11:22:33",
		type: 1,
		isOn: false,
	};

	return { ...defaultMock, ...overrides };
}

export function createDeviceGroupMock(
	overrides?: Partial<DeviceGroup>,
): DeviceGroup {
	const defaultMock: DeviceGroup = {
		id: "group-test-01",
		name: "Todas as Luzes",
		icon: "lightbulb",
		devices: [
			createDeviceInGroupMock(),
			createDeviceInGroupMock({
				id: "device-group-dev-02",
				name: "Lâmpada de Mesa",
				isOn: true,
			}),
		],
		averageBrightness: null,
	};

	return { ...defaultMock, ...overrides };
}

export function createPickerDeviceMock(
	overrides?: Partial<PickerDevice>,
): PickerDevice {
	const defaultMock: PickerDevice = {
		id: "picker-dev-01",
		name: "Lâmpada Sala",
		brand: "Philips Hue",
		isOn: false,
		isOnline: true,
		type: 1,
	};

	return { ...defaultMock, ...overrides };
}
