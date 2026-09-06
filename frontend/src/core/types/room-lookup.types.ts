/**
 * Minimal room shape needed by features that only resolve a room's id/name/icon
 * (device pickers, filters) — a subset of `features/rooms/types/rooms.types.ts`'s
 * full `Room` (which also carries `automationCount`, CRUD payloads, etc.).
 */
export interface RoomLookupItem {
	id: string;
	name: string;
	icon?: string | null;
}
