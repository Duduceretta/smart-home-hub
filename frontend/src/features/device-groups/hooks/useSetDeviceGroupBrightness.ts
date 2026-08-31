import { useMutation, useQueryClient } from "@tanstack/react-query";
import { setDeviceGroupBrightnessRequest } from "../api/device-groups.api";
import { deviceGroupsKeys } from "./device-groups.keys";

interface SetDeviceGroupBrightnessVariables {
	groupId: string;
	brightnessPercent: number;
}

/**
 * Mutation hook to set brightness for all lighting devices in a group
 * via `PUT /api/device-groups/{id}/devices/brightness`.
 */
export function useSetDeviceGroupBrightness() {
	const queryClient = useQueryClient();

	return useMutation<void, Error, SetDeviceGroupBrightnessVariables>({
		mutationFn: ({ groupId, brightnessPercent }) =>
			setDeviceGroupBrightnessRequest(groupId, brightnessPercent),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: deviceGroupsKeys.lists() });
			queryClient.invalidateQueries({ queryKey: ["devices", "list"] });
		},
	});
}
