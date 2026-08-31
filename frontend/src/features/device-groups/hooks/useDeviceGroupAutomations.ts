import { useQuery } from "@tanstack/react-query";
import { fetchDeviceGroupAutomations } from "../api/device-groups.api";
import type { DeviceGroupLinkedAutomation } from "../types/device-groups.types";
import { deviceGroupsKeys } from "./device-groups.keys";

/**
 * Hook to retrieve automations linked to a specific device group
 * via `GET /api/device-groups/{id}/automations`.
 */
export function useDeviceGroupAutomations(groupId: string) {
	return useQuery<DeviceGroupLinkedAutomation[], Error>({
		queryKey: deviceGroupsKeys.automations(groupId),
		queryFn: () => fetchDeviceGroupAutomations(groupId),
		enabled: Boolean(groupId),
		staleTime: 1000 * 60,
		retry: 1,
	});
}
