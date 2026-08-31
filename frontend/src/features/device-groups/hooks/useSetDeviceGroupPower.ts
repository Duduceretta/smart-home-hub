import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { AppError } from "@/core/errors/app.errors";
import { setDeviceGroupBulkPowerRequest } from "../api/device-groups.api";
import type {
	DeviceGroupBulkPowerResult,
	DeviceInGroup,
} from "../types/device-groups.types";
import { deviceGroupsKeys } from "./device-groups.keys";

/**
 * Executes a bulk power command ("Ligar Todos" / "Desligar Todos")
 * across all actuator devices in a group.
 */
export function useSetDeviceGroupPower() {
	const queryClient = useQueryClient();

	return useMutation<
		DeviceGroupBulkPowerResult,
		AppError,
		{ devices: DeviceInGroup[]; desiredState: boolean }
	>({
		mutationFn: ({ devices, desiredState }) =>
			setDeviceGroupBulkPowerRequest(devices, desiredState),

		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: deviceGroupsKeys.lists() });
			queryClient.invalidateQueries({ queryKey: ["devices", "list"] });
			queryClient.invalidateQueries({ queryKey: ["dashboard", "rooms"] });
		},
	});
}
