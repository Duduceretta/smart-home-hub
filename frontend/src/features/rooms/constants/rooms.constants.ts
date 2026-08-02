import { Armchair, Bath, Bed, Car, CookingPot, Home, Tv } from "lucide-react";
import type { ComponentType } from "react";

export interface RoomIconOption {
	id: string;
	label: string;
	icon: ComponentType<{ className?: string }>;
}

/**
 * List of available icons for room visual assignment.
 * Used across forms (Create/Edit sheets) and room displays.
 */
export const ROOM_ICON_OPTIONS: RoomIconOption[] = [
	{ id: "chair", label: "Sala", icon: Armchair },
	{ id: "bed", label: "Quarto", icon: Bed },
	{ id: "restaurant", label: "Cozinha", icon: CookingPot },
	{ id: "tv", label: "Mídia/Eletro", icon: Tv },
	{ id: "garage", label: "Garagem", icon: Car },
	{ id: "bathtub", label: "Banheiro", icon: Bath },
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
