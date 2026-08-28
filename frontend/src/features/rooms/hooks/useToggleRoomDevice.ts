import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Logger } from "@/core/logger/app.logger";
import { toggleRoomDeviceRequest } from "../api/room-devices.api";
import { roomsKeys } from "./rooms.keys";

/**
 * Toggles a device's on/off state from the `RoomDetailPanel` device grid.
 */
export function useToggleRoomDevice() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (deviceId: string) => toggleRoomDeviceRequest(deviceId),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: roomsKeys.pickerDevices() });
		},
		onError: (error: Error) => {
			Logger.error("Falha ao alternar o dispositivo", error);
			toast.error(error.message || "Não foi possível alternar o dispositivo.");
		},
	});
}
