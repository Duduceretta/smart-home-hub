import {
	Camera as CameraIcon,
	Lightbulb,
	Lock,
	Power,
	Radar,
	Siren,
	Thermometer,
	Tv,
} from "lucide-react";
import type { ComponentType } from "react";
import { DeviceTypeEnum } from "@/core/types/device-type.enum";

export type DeviceIconConfig = {
	icon: ComponentType<{ className?: string }>;
	bg: string;
	text: string;
};

/**
 * Icon + color per device type. Lives in `core/` alongside `DeviceTypeEnum`
 * because it's consumed outside `features/devices` (dashboard's room-preview
 * picker) — `features/devices/constants/devices.constants.ts` re-exports
 * this same binding so nothing inside that feature had to change.
 */
// Paleta categórica intencional (uma cor distinta por tipo de dispositivo, não
// segue tokens semânticos do design system) — design-token-lint-ignore
export const DEVICE_CONFIG: Record<DeviceTypeEnum, DeviceIconConfig> = {
	[DeviceTypeEnum.Light]: {
		icon: Lightbulb,
		bg: "bg-yellow-500/10",
		text: "text-yellow-400",
	},
	[DeviceTypeEnum.Switch]: {
		icon: Power,
		bg: "bg-indigo-500/10", // design-token-lint-ignore
		text: "text-indigo-400", // design-token-lint-ignore
	},
	[DeviceTypeEnum.Sensor]: {
		icon: Radar,
		bg: "bg-purple-500/10",
		text: "text-purple-400",
	},
	[DeviceTypeEnum.Thermostat]: {
		icon: Thermometer,
		bg: "bg-blue-500/10",
		text: "text-blue-400",
	},
	[DeviceTypeEnum.Camera]: {
		icon: CameraIcon,
		bg: "bg-slate-500/10", // design-token-lint-ignore
		text: "text-slate-300", // design-token-lint-ignore
	},
	[DeviceTypeEnum.Lock]: {
		icon: Lock,
		bg: "bg-red-500/10", // design-token-lint-ignore
		text: "text-red-400", // design-token-lint-ignore
	},
	[DeviceTypeEnum.Alarm]: {
		icon: Siren,
		bg: "bg-orange-500/10",
		text: "text-orange-400",
	},
	[DeviceTypeEnum.Television]: {
		icon: Tv,
		bg: "bg-teal-500/10",
		text: "text-teal-400",
	},
};
