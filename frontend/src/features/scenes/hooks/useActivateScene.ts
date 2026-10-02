import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Logger } from "@/core/logger/app.logger";
import { activateSceneRequest } from "../api/scenes.api";
import type { SceneActivationResult } from "../types/scenes.types";
import { scenesKeys } from "./scenes.keys";

/** "2 de 4 aplicados · 1 offline · 1 com falha" — só cita o que aconteceu. */
function describeOutcome(result: SceneActivationResult): string {
	const total = result.appliedCount + result.failedCount + result.skippedCount;
	const parts = [`${result.appliedCount} de ${total} aplicados`];

	if (result.skippedCount > 0) parts.push(`${result.skippedCount} offline`);
	if (result.failedCount > 0) parts.push(`${result.failedCount} com falha`);

	return parts.join(" · ");
}

/**
 * Ativa uma cena. A ativação não é transacional, então o toast reflete o
 * desfecho real: tudo aplicado, aplicado com ressalvas ou nada aplicado.
 * Revalida as listas porque `lastActivatedAt` muda quando algo foi aplicado.
 */
export function useActivateScene() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (id: string) => activateSceneRequest(id),
		onSuccess: (result) => {
			queryClient.invalidateQueries({ queryKey: scenesKeys.lists() });

			if (result.appliedCount === 0) {
				toast.error(
					`Nenhum dispositivo respondeu à cena "${result.sceneName}"`,
					{
						description: describeOutcome(result),
					},
				);
				return;
			}

			if (result.failedCount > 0 || result.skippedCount > 0) {
				toast.warning(`Cena "${result.sceneName}" ativada com ressalvas`, {
					description: describeOutcome(result),
				});
				return;
			}

			toast.success(`Cena "${result.sceneName}" ativada`);
		},
		onError: (error: Error) => {
			Logger.error("Falha ao ativar a cena", error);
			toast.error(error.message || "Não foi possível ativar a cena.");
		},
	});
}
