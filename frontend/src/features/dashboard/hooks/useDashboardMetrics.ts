import { useQuery } from "@tanstack/react-query";
import { fetchDashboardMetrics } from "../api/dashboard.api";
import type { DashboardMetrics } from "../types/dashboard.types";

export const DASHBOARD_QUERY_KEYS = {
	metrics: ["dashboard", "metrics"] as const,
};

export function useDashboardMetrics() {
	return useQuery<DashboardMetrics, Error>({
		queryKey: DASHBOARD_QUERY_KEYS.metrics,
		queryFn: fetchDashboardMetrics,
		refetchInterval: 1000 * 60,
	});
}
