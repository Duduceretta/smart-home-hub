/**
 * DeviceType mapping matching C# backend enum integers. Lives in `core/`
 * (not `features/devices`) because it's cross-feature vocabulary consumed
 * directly by `dashboard` (chip filters, room-preview row capacity) without
 * needing the rest of the `devices` domain — `features/devices/types/devices.types.ts`
 * re-exports this same binding so nothing inside that feature had to change.
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
