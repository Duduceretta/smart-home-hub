/**
 * Represents the room read-model (RoomDto)
 * returned by C# API queries.
 */
export interface Room {
	id: string;
	name: string;
	icon?: string | null;
}

/**
 * Payload required to create a new room (CreateRoomRequest).
 */
export interface CreateRoomPayload {
	name: string;
	icon?: string | null;
}

/**
 * Payload required to update an existing room (UpdateRoomRequest).
 */
export interface UpdateRoomPayload {
	name: string;
	icon?: string | null;
}

export type RoomsViewMode = "cards" | "list";
