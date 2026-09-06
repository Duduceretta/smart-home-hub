import {
	Armchair,
	Bath,
	Bed,
	Briefcase,
	Car,
	CookingPot,
	Home,
	Trees,
	Tv,
} from "lucide-react";
import type { ComponentType } from "react";

/**
 * Room icon lookup by id — used by every feature that renders a room's icon
 * (dashboard, devices, rooms) without importing directly from `features/rooms`
 * (FSD forbids cross-feature imports). `features/rooms/constants/rooms.constants.ts`
 * re-exports this same binding for its own internal usage and owns the
 * picker UI (`ROOM_ICON_OPTIONS`) built on top of it.
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
	garden: Trees,
	office: Briefcase,
	default: Home,
};
