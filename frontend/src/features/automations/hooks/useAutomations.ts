import { useQuery } from "@tanstack/react-query";
import { fetchAutomations } from "../api/automations.api";
import type { Automation } from "../types/automations.types";
import { automationsKeys } from "./automations.keys";

/**
 * Custom Hook to fetch and cache all user automations.
 * Configured with a 5-minute stale time for optimal network performance.
 */
export function useAutomations() {
	return useQuery<Automation[], Error>({
		queryKey: automationsKeys.lists(),
		queryFn: () => fetchAutomations(),
		staleTime: 1000 * 60 * 5,
		retry: 1,
	});
}
