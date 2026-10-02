import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Logger } from "@/core/logger/app.logger";
import { deleteSceneRequest } from "../api/scenes.api";
import { scenesKeys } from "./scenes.keys";

/**
 * Exclusão lógica de uma cena; revalida as listas para a galeria atualizar na hora.
 */
export function useDeleteScene() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (id: string) => deleteSceneRequest(id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: scenesKeys.lists() });
			toast.success("Cena removida com sucesso!");
		},
		onError: (error: Error) => {
			Logger.error("Falha ao remover a cena", error);
			toast.error(error.message || "Não foi possível remover a cena.");
		},
	});
}
