import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Logger } from "@/core/logger/app.logger";
import { updateDeviceRoomAssignmentRequest } from "../api/room-devices.api";
import type { RoomDeviceAssignmentPayload } from "../types/room-devices.types";
import { roomsKeys } from "./rooms.keys";

/**
 * Reassigns a single device to (or away from) a room. Called individually
 * per changed device from `RoomFormDialog`'s submit — no bulk endpoint
 * exists, the assignment lives on `Device.RoomId`, not on the Room itself.
 * No toast here: the room's own create/update mutation already surfaces a
 * single success toast for the whole save action.
 */
export function useAssignDeviceToRoom() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({
			id,
			payload,
		}: {
			id: string;
			payload: RoomDeviceAssignmentPayload;
		}) => updateDeviceRoomAssignmentRequest({ id, payload }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: roomsKeys.pickerDevices() });
		},
		onError: (error: Error) => {
			Logger.error("Falha ao atribuir dispositivo ao ambiente", error);
		},
	});
}
