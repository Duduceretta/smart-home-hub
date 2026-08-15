import {
	Boxes,
	Layers,
	Lightbulb,
	ShieldCheck,
	Tv,
	Zap,
} from "lucide-react";
import type { ComponentType } from "react";

export interface DeviceGroupIconOption {
	id: string;
	label: string;
	icon: ComponentType<{ className?: string }>;
}

/**
 * List of available icons for device-group visual assignment.
 * Used across forms (Create/Edit sheets) and group displays.
 */
export const GROUP_ICON_OPTIONS: DeviceGroupIconOption[] = [
	{ id: "layers", label: "Geral", icon: Layers },
	{ id: "boxes", label: "Grupo", icon: Boxes },
	{ id: "lightbulb", label: "Iluminação", icon: Lightbulb },
	{ id: "tv", label: "Mídia", icon: Tv },
	{ id: "shield", label: "Segurança", icon: ShieldCheck },
	{ id: "zap", label: "Automação", icon: Zap },
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
