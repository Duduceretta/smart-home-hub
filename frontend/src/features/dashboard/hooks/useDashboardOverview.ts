import { useQuery } from "@tanstack/react-query";
import { fetchDashboardOverview } from "../api/dashboard.api";
import type { DashboardOverviewResponse } from "../types/dashboard.types";
import { dashboardKeys } from "./dashboard.keys";

export function useDashboardOverview() {
	return useQuery<DashboardOverviewResponse, Error>({
		queryKey: dashboardKeys.overview(),
		queryFn: fetchDashboardOverview,
		staleTime: 1000 * 60 * 5,
		retry: 1,
	});
}
