import { useQuery } from "@tanstack/react-query";
import { fetchDeviceGroups } from "../api/device-groups.api";
import type { DeviceGroup } from "../types/device-groups.types";
import { deviceGroupsKeys } from "./device-groups.keys";

/**
 * Custom Hook to fetch and cache all user device groups.
 * Configured with a 5-minute stale time for optimal network performance.
 */
export function useDeviceGroups() {
	return useQuery<DeviceGroup[], Error>({
		queryKey: deviceGroupsKeys.lists(),
		queryFn: () => fetchDeviceGroups(),
		staleTime: 1000 * 60 * 5,
		retry: 1,
	});
}
