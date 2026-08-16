import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/core/api/api.client";
import type { DashboardOverviewResponse } from "../types/dashboard.types";
import { dashboardKeys } from "./dashboard.keys";

async function fetchDashboardOverview(): Promise<DashboardOverviewResponse> {
	const { data } = await apiClient.get<DashboardOverviewResponse>(
		"/dashboard/overview",
	);
	return data;
}

export function useDashboardOverview() {
    return useQuery<DashboardOverviewResponse, Error>({
        queryKey: dashboardKeys.overview(),
        queryFn: fetchDashboardOverview,
        staleTime: 1000 * 60 * 5,
        retry: 1,
    });
}
