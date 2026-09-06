import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { DASHBOARD_QUERY_ROOT } from "@/core/constants/query-key-roots";
import { Logger } from "@/core/logger/app.logger";
import { deleteAutomationRequest } from "../api/automations.api";
import { automationsKeys } from "./automations.keys";

/**
 * Custom Hook for performing logical deletion of an automation.
 * Revalidates automation lists to immediately refresh the UI.
 */
export function useDeleteAutomation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (id: string) => deleteAutomationRequest(id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: automationsKeys.lists() });
			queryClient.invalidateQueries({
				queryKey: automationsKeys.filterCounts(),
			});
			queryClient.invalidateQueries({ queryKey: DASHBOARD_QUERY_ROOT });
			toast.success("Automação removida com sucesso!");
		},
		onError: (error: Error) => {
			Logger.error("Falha ao remover a automação", error);
			toast.error(error.message || "Não foi possível remover a automação.");
		},
	});
}
