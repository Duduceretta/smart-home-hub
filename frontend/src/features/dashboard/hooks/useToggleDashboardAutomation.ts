import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Logger } from "@/core/logger/app.logger";
import { updateDashboardAutomationStatus } from "../api/dashboard.api";
import { dashboardKeys } from "./dashboard.keys";

interface ToggleDashboardAutomationArgs {
	id: string;
	name: string;
	rulePayload: string;
	isActive: boolean;
}

export function useToggleDashboardAutomation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({
			id,
			name,
			rulePayload,
			isActive,
		}: ToggleDashboardAutomationArgs) =>
			updateDashboardAutomationStatus(id, name, rulePayload, isActive),
		onMutate: async ({ id, isActive }) => {
			await queryClient.cancelQueries({
				queryKey: dashboardKeys.automationsSummary(),
			});

			const previous = queryClient.getQueryData(
				dashboardKeys.automationsSummary(),
			);

			const nowIso = new Date().toISOString();

			queryClient.setQueryData(
				dashboardKeys.automationsSummary(),
				(
					old:
						| { id: string; isActive: boolean; updatedAt?: string }[]
						| undefined,
				) =>
					old?.map((item) =>
						item.id === id ? { ...item, isActive, updatedAt: nowIso } : item,
					),
			);

			return { previous };
		},
		onError: (error: Error, _variables, context) => {
			if (context?.previous) {
				queryClient.setQueryData(
					dashboardKeys.automationsSummary(),
					context.previous,
				);
			}
			Logger.error("Falha ao alterar estado da automação no dashboard", error);
			toast.error(
				error.message || "Não foi possível alterar o estado da automação.",
			);
		},
		onSuccess: (_data, { isActive }) => {
			toast.success(
				isActive
					? "Automação ativada com sucesso!"
					: "Automação desativada com sucesso!",
			);
		},
		onSettled: () => {
			queryClient.invalidateQueries({
				queryKey: dashboardKeys.automationsSummary(),
			});
			queryClient.invalidateQueries({
				queryKey: ["automations"],
			});
		},
	});
}
