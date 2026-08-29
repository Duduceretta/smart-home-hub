import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Logger } from "@/core/logger/app.logger";
import { deleteRoomRequest } from "../api/rooms.api";
import { roomsKeys } from "./rooms.keys";

/**
 * Custom Hook for performing logical deletion of a room.
 * Revalidates room lists to immediately refresh the dashboard UI.
 */
export function useDeleteRoom() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (id: string) => deleteRoomRequest(id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: roomsKeys.lists() });
			// O picker de dispositivos (RoomFormDialog/RoomDeviceAssignmentPicker)
			// mostra o roomId de cada device — sem isso ficaria mostrando o
			// ambiente já excluído até o cache expirar por conta própria.
			queryClient.invalidateQueries({ queryKey: roomsKeys.pickerDevices() });
			toast.success("Ambiente removido com sucesso!");
		},
		onError: (error: Error) => {
			Logger.error("Falha ao remover o ambiente", error);
			toast.error(error.message || "Não foi possível remover o ambiente.");
		},
	});
}
