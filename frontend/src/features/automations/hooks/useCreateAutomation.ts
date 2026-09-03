import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Logger } from "@/core/logger/app.logger";
import { createAutomationRequest } from "../api/automations.api";
import type { CreateAutomationPayload } from "../types/automations.types";
import { automationsKeys } from "./automations.keys";

/**
 * Custom Hook for creating a new automation.
 * Automatically invalidates automation lists on success and presents user feedback.
 */
export function useCreateAutomation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (payload: CreateAutomationPayload) =>
			createAutomationRequest(payload),
		onSuccess: (data) => {
			queryClient.invalidateQueries({ queryKey: automationsKeys.lists() });
			queryClient.invalidateQueries({
				queryKey: automationsKeys.filterCounts(),
			});
			queryClient.invalidateQueries({
				queryKey: ["dashboard", "automations-summary"],
			});
			toast.success(data.message || "Automação criada com sucesso!");
		},
		onError: (error: Error) => {
			Logger.error("Falha ao criar a automação", error);
			toast.error(error.message || "Não foi possível criar a automação.");
		},
	});
}
