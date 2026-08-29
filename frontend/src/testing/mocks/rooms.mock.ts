import type {
	Room,
	RoomActivityEntry,
	RoomClimate,
	RoomEnergy,
	RoomLinkedAutomation,
	RoomPickerDevice,
} from "@/features/rooms/types/rooms.types";

export function createRoomMock(overrides?: Partial<Room>): Room {
	const defaultMock: Room = {
		id: "room-test-01",
		name: "Sala de Estar",
		icon: "chair",
		automationCount: 0,
	};

	return { ...defaultMock, ...overrides };
}

export function createRoomPickerDeviceMock(
	overrides?: Partial<RoomPickerDevice>,
): RoomPickerDevice {
	const defaultMock: RoomPickerDevice = {
		id: "device-test-01",
		name: "Lâmpada Sala",
		brand: "Philips Hue",
		externalId: "AA:BB:CC:11:22:33",
		type: 1,
		integrationType: 1,
		roomId: "room-test-01",
		isOnline: true,
		isOn: false,
	};

	return { ...defaultMock, ...overrides };
}

export function createRoomClimateMock(
	overrides?: Partial<RoomClimate>,
): RoomClimate {
	const defaultMock: RoomClimate = {
		hasClimateSensor: true,
		temperatureCelsius: 23,
		humidityPercent: 55,
		readingTimestampUtc: "2026-08-26T12:00:00Z",
	};

	return { ...defaultMock, ...overrides };
}

export function createRoomEnergyMock(
	overrides?: Partial<RoomEnergy>,
): RoomEnergy {
	const defaultMock: RoomEnergy = {
		hasEnergyData: true,
		chart: [
			{ timestamp: "2026-08-26T12:00:00Z", value: 0.12, isEstimated: false },
			{ timestamp: "2026-08-26T12:05:00Z", value: 0.15, isEstimated: false },
		],
		totalConsumptionKwh: 0.13,
		isEnergyEstimated: false,
	};

	return { ...defaultMock, ...overrides };
}

export function createRoomLinkedAutomationMock(
	overrides?: Partial<RoomLinkedAutomation>,
): RoomLinkedAutomation {
	const defaultMock: RoomLinkedAutomation = {
		id: "automation-test-01",
		name: "Ligar luzes ao anoitecer",
		isActive: true,
		triggerKind: "schedule",
	};

	return { ...defaultMock, ...overrides };
}

export function createRoomActivityEntryMock(
	overrides?: Partial<RoomActivityEntry>,
): RoomActivityEntry {
	const defaultMock: RoomActivityEntry = {
		id: "event-test-01",
		deviceId: "device-test-01",
		eventType: "DeviceStatus",
		title: "Lâmpada Sala ligado",
		description: "Ambiente: Sala de Estar",
		timestamp: "2026-08-26T12:00:00Z",
		isAlert: false,
	};

	return { ...defaultMock, ...overrides };
}
