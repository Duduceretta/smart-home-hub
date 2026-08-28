import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Logger } from "@/core/logger/app.logger";
import { updateRoomRequest } from "../api/rooms.api";
import type { UpdateRoomPayload } from "../types/rooms.types";
import { roomsKeys } from "./rooms.keys";

interface UpdateRoomArgs {
	id: string;
	payload: UpdateRoomPayload;
}

/**
 * Custom Hook for updating an existing room.
 * Invalidates lists and detail cache upon successful completion.
 */
export function useUpdateRoom() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ id, payload }: UpdateRoomArgs) =>
			updateRoomRequest({ id, payload }),
		onSuccess: (updatedRoom) => {
			queryClient.invalidateQueries({ queryKey: roomsKeys.lists() });
			queryClient.invalidateQueries({
				queryKey: roomsKeys.detail(updatedRoom.id),
			});
			toast.success("Ambiente atualizado com sucesso!");
		},
		onError: (error: Error) => {
			Logger.error("Falha ao atualizar o ambiente", error);
			toast.error(error.message || "Não foi possível atualizar o ambiente.");
		},
	});
}
