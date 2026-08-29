import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Logger } from "@/core/logger/app.logger";
import { setRoomDevicesPowerRequest } from "../api/rooms.api";
import { roomsKeys } from "./rooms.keys";

/** "Ligar Tudo"/"Desligar Tudo" — POST /rooms/{id}/devices/turn-on|turn-off. */
export function useSetRoomDevicesPower(roomId: string) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (desiredState: boolean) =>
			setRoomDevicesPowerRequest(roomId, desiredState),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: roomsKeys.pickerDevices() });
		},
		onError: (error: Error) => {
			Logger.error("Falha na ação em massa do ambiente", error);
			toast.error(error.message || "Não foi possível executar a ação.");
		},
	});
}
