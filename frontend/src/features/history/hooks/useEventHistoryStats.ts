import { useQuery } from "@tanstack/react-query";
import { getEventHistoryStats } from "../api/history.api";
import type {
	GetHistoryStatsParams,
	HistoryKpiMetrics,
} from "../types/history.types";
import { historyKeys } from "./history.keys";

/**
 * Hook to retrieve aggregated event history KPI counts (total/automation/alert/
 * group-action) over the whole filtered period, matching specified filter params.
 */
export function useEventHistoryStats(params: GetHistoryStatsParams) {
	return useQuery<HistoryKpiMetrics, Error>({
		queryKey: historyKeys.statsFiltered(params),
		queryFn: () => getEventHistoryStats(params),
		staleTime: 1000 * 30, // 30s
		placeholderData: (prev) => prev,
	});
}
