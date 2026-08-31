import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { AppError } from "@/core/errors/app.errors";
import { setDeviceGroupPowerRequest } from "../api/device-groups.api";
import type { DeviceGroupBulkPowerResult } from "../types/device-groups.types";
import { deviceGroupsKeys } from "./device-groups.keys";

interface SetDeviceGroupPowerVariables {
	groupId: string;
	desiredState: boolean;
}

/**
 * Executes a server-side bulk power command ("Ligar Todos" / "Desligar Todos")
 * across all actuator devices in a group via `POST /api/device-groups/{id}/devices/turn-on|turn-off`.
 */
export function useSetDeviceGroupPower() {
	const queryClient = useQueryClient();

	return useMutation<
		DeviceGroupBulkPowerResult,
		AppError,
		SetDeviceGroupPowerVariables
	>({
		mutationFn: ({ groupId, desiredState }) =>
			setDeviceGroupPowerRequest(groupId, desiredState),

		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: deviceGroupsKeys.lists() });
			queryClient.invalidateQueries({ queryKey: ["devices", "list"] });
			queryClient.invalidateQueries({ queryKey: ["dashboard", "rooms"] });
		},
	});
}
