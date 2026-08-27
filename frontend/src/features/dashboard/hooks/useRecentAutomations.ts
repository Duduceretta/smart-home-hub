import { useQuery } from "@tanstack/react-query";
import { fetchAutomationsSummary } from "../api/dashboard.api";
import { dashboardKeys } from "./dashboard.keys";

export function useRecentAutomations() {
	return useQuery({
		queryKey: dashboardKeys.automationsSummary(),
		queryFn: fetchAutomationsSummary,
		staleTime: 1000 * 60,
	});
}
