import { Boxes, Layers, Lightbulb, ShieldCheck, Tv, Zap } from "lucide-react";
import type { ComponentType } from "react";

export type DeviceGroupIconLabelKey =
	| "icons.general"
	| "icons.group"
	| "icons.lighting"
	| "icons.media"
	| "icons.security"
	| "icons.automation";

export interface DeviceGroupIconOption {
	id: string;
	labelKey: DeviceGroupIconLabelKey;
	icon: ComponentType<{ className?: string }>;
}

/**
 * List of available icons for device-group visual assignment.
 * Used across forms (Create/Edit sheets) and group displays.
 * `labelKey` points to a key under the `device-groups` namespace's `icons` object.
 */
export const GROUP_ICON_OPTIONS: DeviceGroupIconOption[] = [
	{ id: "layers", labelKey: "icons.general", icon: Layers },
	{ id: "boxes", labelKey: "icons.group", icon: Boxes },
	{ id: "lightbulb", labelKey: "icons.lighting", icon: Lightbulb },
	{ id: "tv", labelKey: "icons.media", icon: Tv },
	{ id: "shield", labelKey: "icons.security", icon: ShieldCheck },
	{ id: "zap", labelKey: "icons.automation", icon: Zap },
];

/**
 * Map for quick O(1) icon lookup by ID string.
 * Used primarily in DeviceGroupCard for rendering. Unlike Rooms, the icon is
 * optional here, so `default` covers both a missing selection and `null`.
 */
export const GROUP_ICON_MAP: Record<
	string,
	ComponentType<{ className?: string }>
> = {
	layers: Layers,
	boxes: Boxes,
	lightbulb: Lightbulb,
	tv: Tv,
	shield: ShieldCheck,
	zap: Zap,
	default: Layers,
};

/**
 * Icon by device type, reimplemented locally in `device-groups` feature (FSD isolation).
 * Numeric keys mirror `DeviceTypeEnum` from backend:
 * 1 Light, 2 Outlet, 3 Sensor, 4 Thermostat, 5 Camera, 6 Lock, 7 Alarm, 8 TV.
 */
export const GROUP_DEVICE_TYPE_ICON: Record<
	number,
	ComponentType<{ className?: string }>
> = {
	1: Lightbulb,
	2: Zap,
	3: ShieldCheck,
	4: Zap,
	5: ShieldCheck,
	6: ShieldCheck,
	7: ShieldCheck,
	8: Tv,
};

export const GROUP_DEVICE_TELEVISION_TYPE = 8;

/**
 * Actuator types that can be toggled on/off.
 */
export const GROUP_DEVICE_ACTUATOR_TYPES = new Set([1, 2, 4, 6, 7, 8]);
