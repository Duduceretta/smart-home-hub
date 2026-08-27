import { useQuery } from "@tanstack/react-query";
import { fetchAutomationExecutionHistory } from "../api/automations.api";
import { automationsKeys } from "./automations.keys";

export function useAutomationExecutionHistory(
	automationId: string | undefined,
	page = 1,
	pageSize = 10,
) {
	return useQuery({
		queryKey: automationsKeys.executionHistory(
			automationId ?? "",
			page,
			pageSize,
		),
		queryFn: () =>
			fetchAutomationExecutionHistory(automationId as string, page, pageSize),
		enabled: Boolean(automationId),
		staleTime: 1000 * 30,
		retry: 1,
	});
}
