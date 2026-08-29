import { DeviceTypeEnum } from "@/features/devices/types/devices.types";

/** Quantas "unidades de coluna" da grade 2 colunas o DeviceCard ocupa — precisa bater com o isWide de DeviceCard.tsx. */
export const ROW_CAPACITY_UNITS = 2;

export function isWideDevice(type: DeviceTypeEnum): boolean {
	return (
		type === DeviceTypeEnum.Television || type === DeviceTypeEnum.Thermostat
	);
}

export function deviceUnitWidth(type: DeviceTypeEnum): number {
	return isWideDevice(type) ? 2 : 1;
}
