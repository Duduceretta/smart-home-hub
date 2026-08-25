import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/core/api/api.client";
import type { PagedResponse } from "@/core/types/pagination.types";
import type { ActivityLogEntry } from "../types/dashboard.types";
import { dashboardKeys } from "./dashboard.keys";

async function fetchActivityLog(
	page: number,
	pageSize: number,
): Promise<PagedResponse<ActivityLogEntry>> {
	const { data } = await apiClient.get<PagedResponse<ActivityLogEntry>>(
		"/dashboard/activity-log",
		{ params: { page, pageSize } },
	);
	return data;
}

export function useActivityLog(page = 1, pageSize = 10) {
	return useQuery<PagedResponse<ActivityLogEntry>, Error>({
		queryKey: dashboardKeys.activityLog(page, pageSize),
		queryFn: () => fetchActivityLog(page, pageSize),
		staleTime: 1000 * 30,
		retry: 1,
	});
}
