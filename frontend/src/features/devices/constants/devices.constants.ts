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
import { DeviceTypeEnum } from "../types/devices.types";

export const DEVICE_CATEGORIES = [
	"Todos",
	"Iluminação",
	"Climatização",
	"Segurança",
	"Eletrodomésticos",
] as const;

export type DeviceCategory = (typeof DEVICE_CATEGORIES)[number];

/**
 * Maps each category filter value (also used as the API's `category` query
 * param, kept stable across locales) to its i18n key under the `devices`
 * namespace's `categories` object, for translated display labels.
 */
export const CATEGORY_LABEL_KEYS = {
	Todos: "categories.all",
	Iluminação: "categories.lighting",
	Climatização: "categories.climate",
	Segurança: "categories.security",
	Eletrodomésticos: "categories.appliances",
} as const satisfies Record<DeviceCategory, string>;

export type DeviceIconConfig = {
	icon: ComponentType<{ className?: string }>;
	bg: string;
	text: string;
};

export const DEVICE_CONFIG: Record<DeviceTypeEnum, DeviceIconConfig> = {
	[DeviceTypeEnum.Light]: {
		icon: Lightbulb,
		bg: "bg-yellow-500/10",
		text: "text-yellow-400",
	},
	[DeviceTypeEnum.Switch]: {
		icon: Power,
		bg: "bg-indigo-500/10",
		text: "text-indigo-400",
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
		bg: "bg-slate-500/10",
		text: "text-slate-300",
	},
	[DeviceTypeEnum.Lock]: {
		icon: Lock,
		bg: "bg-red-500/10",
		text: "text-red-400",
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
