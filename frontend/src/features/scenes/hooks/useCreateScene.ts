import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Logger } from "@/core/logger/app.logger";
import { createSceneRequest } from "../api/scenes.api";
import type { CreateScenePayload } from "../types/scenes.types";
import { scenesKeys } from "./scenes.keys";

/**
 * Cria uma cena, revalida as listas e avisa o usuário.
 */
export function useCreateScene() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (payload: CreateScenePayload) => createSceneRequest(payload),
		onSuccess: (data) => {
			queryClient.invalidateQueries({ queryKey: scenesKeys.lists() });
			toast.success(data.message || "Cena criada com sucesso!");
		},
		onError: (error: Error) => {
			Logger.error("Falha ao criar a cena", error);
			toast.error(error.message || "Não foi possível criar a cena.");
		},
	});
}
