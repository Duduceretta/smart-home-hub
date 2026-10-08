import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Logger } from "@/core/logger/app.logger";
import { updateSceneRequest } from "../api/scenes.api";
import type { UpdateScenePayload } from "../types/scenes.types";
import { scenesKeys } from "./scenes.keys";

/**
 * Atualiza nome, ícone e itens de uma cena. A API não devolve corpo, então
 * todo o cache de cenas é revalidado.
 */
export function useUpdateScene() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (variables: { id: string; payload: UpdateScenePayload }) =>
			updateSceneRequest(variables),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: scenesKeys.all });
			toast.success("Cena atualizada com sucesso!");
		},
		onError: (error: Error) => {
			Logger.error("Falha ao atualizar a cena", error);
			toast.error(error.message || "Não foi possível atualizar a cena.");
		},
	});
}
