import { useQuery } from "@tanstack/react-query";
import type { PagedResponse } from "@/core/types/pagination.types";
import { getEventHistory } from "../api/history.api";
import type { GetHistoryParams, HistoryEvent } from "../types/history.types";
import { historyKeys } from "./history.keys";

/**
 * Hook to retrieve paginated event history matching specified filter params.
 */
export function useEventHistory(params: GetHistoryParams) {
	return useQuery<PagedResponse<HistoryEvent>, Error>({
		queryKey: historyKeys.list(params),
		queryFn: () => getEventHistory(params),
		staleTime: 1000 * 30, // 30s
		placeholderData: (prev) => prev,
	});
}
