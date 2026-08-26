import { useQuery } from "@tanstack/react-query";
import type { PagedResponse } from "@/core/types/pagination.types";
import { fetchActivityLog } from "../api/dashboard.api";
import type { ActivityLogEntry } from "../types/dashboard.types";
import { dashboardKeys } from "./dashboard.keys";

export function useActivityLog(page = 1, pageSize = 10) {
	return useQuery<PagedResponse<ActivityLogEntry>, Error>({
		queryKey: dashboardKeys.activityLog(page, pageSize),
		queryFn: () => fetchActivityLog(page, pageSize),
		staleTime: 1000 * 30,
		retry: 1,
	});
}
