import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Logger } from "@/core/logger/app.logger";
import { updateAutomationRequest } from "../api/automations.api";
import type { UpdateAutomationPayload } from "../types/automations.types";
import { automationsKeys } from "./automations.keys";

interface UpdateAutomationArgs {
	id: string;
	payload: UpdateAutomationPayload;
}

/**
 * Custom Hook for updating an existing automation.
 * Invalidates lists and detail cache upon successful completion.
 */
export function useUpdateAutomation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ id, payload }: UpdateAutomationArgs) =>
			updateAutomationRequest({ id, payload }),
		onSuccess: (updatedAutomation) => {
			queryClient.invalidateQueries({ queryKey: automationsKeys.lists() });
			queryClient.invalidateQueries({
				queryKey: automationsKeys.detail(updatedAutomation.id),
			});
			queryClient.invalidateQueries({
				queryKey: automationsKeys.filterCounts(),
			});
			queryClient.invalidateQueries({
				queryKey: ["dashboard", "automations-summary"],
			});
			toast.success("Automação atualizada com sucesso!");
		},
		onError: (error: Error) => {
			Logger.error("Falha ao atualizar a automação", error);
			toast.error(error.message || "Não foi possível atualizar a automação.");
		},
	});
}
