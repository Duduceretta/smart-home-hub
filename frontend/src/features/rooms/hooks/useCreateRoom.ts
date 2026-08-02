import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Logger } from "@/core/logger/app.logger";
import { createRoomRequest } from "../api/rooms.api";
import type { CreateRoomPayload } from "../types/rooms.types";
import { roomsKeys } from "./rooms.keys";

/**
 * Custom Hook for creating a new room.
 * Automatically invalidates room lists on success and presents user feedback.
 */
export function useCreateRoom() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (payload: CreateRoomPayload) => createRoomRequest(payload),
		onSuccess: (data) => {
			queryClient.invalidateQueries({ queryKey: roomsKeys.lists() });
			toast.success(data.message || "Ambiente criado com sucesso!");
		},
		onError: (error: Error) => {
			Logger.error("Falha ao criar o ambiente", error);
			toast.error(error.message || "Não foi possível criar o ambiente.");
		},
	});
}