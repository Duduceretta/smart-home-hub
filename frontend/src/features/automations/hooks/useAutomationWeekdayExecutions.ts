import { useQuery } from "@tanstack/react-query";
import { fetchAutomationWeekdayExecutions } from "../api/automations.api";
import { automationsKeys } from "./automations.keys";

export function useAutomationWeekdayExecutions(
	automationId: string | undefined,
	sinceDays = 30,
) {
	return useQuery({
		queryKey: automationsKeys.weekdayExecutions(automationId ?? "", sinceDays),
		queryFn: ({ signal }) =>
			fetchAutomationWeekdayExecutions(
				automationId as string,
				sinceDays,
				signal,
			),
		enabled: Boolean(automationId),
		staleTime: 1000 * 60,
		retry: 1,
	});
}
