import { Armchair, Bath, Bed, Car, CookingPot, Home, Tv } from "lucide-react";
import type { ComponentType } from "react";

export type RoomIconLabelKey =
	| "icons.livingRoom"
	| "icons.bedroom"
	| "icons.kitchen"
	| "icons.media"
	| "icons.garage"
	| "icons.bathroom";

export interface RoomIconOption {
	id: string;
	labelKey: RoomIconLabelKey;
	icon: ComponentType<{ className?: string }>;
}

/**
 * List of available icons for room visual assignment.
 * Used across forms (Create/Edit sheets) and room displays.
 * `labelKey` points to a key under the `rooms` namespace's `icons` object.
 */
export const ROOM_ICON_OPTIONS: RoomIconOption[] = [
	{ id: "chair", labelKey: "icons.livingRoom", icon: Armchair },
	{ id: "bed", labelKey: "icons.bedroom", icon: Bed },
	{ id: "restaurant", labelKey: "icons.kitchen", icon: CookingPot },
	{ id: "tv", labelKey: "icons.media", icon: Tv },
	{ id: "garage", labelKey: "icons.garage", icon: Car },
	{ id: "bathtub", labelKey: "icons.bathroom", icon: Bath },
];

/**
 * Map for quick O(1) icon lookup by ID string.
 * Used primarily in RoomCard for rendering.
 */
export const ROOM_ICON_MAP: Record<
	string,
	ComponentType<{ className?: string }>
> = {
	chair: Armchair,
	bed: Bed,
	restaurant: CookingPot,
	tv: Tv,
	garage: Car,
	bathtub: Bath,
	default: Home,
};
