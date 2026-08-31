import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { AppError } from "@/core/errors/app.errors";
import { Logger } from "@/core/logger/app.logger";
import { toggleDeviceGroupDeviceRequest } from "../api/device-groups.api";
import type { DeviceGroup } from "../types/device-groups.types";
import { deviceGroupsKeys } from "./device-groups.keys";

interface ToggleContext {
	previousGroups?: DeviceGroup[];
}

/**
 * Toggles a single device inside a device group.
 * Applies optimistic update + rollback on `deviceGroupsKeys.lists()`,
 * and invalidates ["devices", "list"] to maintain global sync across features.
 */
export function useToggleDeviceGroupDevice() {
	const queryClient = useQueryClient();

	return useMutation<void, AppError, string, ToggleContext>({
		mutationFn: (deviceId: string) => toggleDeviceGroupDeviceRequest(deviceId),

		onMutate: async (deviceId: string) => {
			await queryClient.cancelQueries({ queryKey: deviceGroupsKeys.lists() });

			const previousGroups = queryClient.getQueryData<DeviceGroup[]>(
				deviceGroupsKeys.lists(),
			);

			if (previousGroups) {
				queryClient.setQueryData<DeviceGroup[]>(
					deviceGroupsKeys.lists(),
					previousGroups.map((group) => ({
						...group,
						devices: group.devices.map((device) =>
							device.id === deviceId
								? { ...device, isOn: !device.isOn }
								: device,
						),
					})),
				);
			}

			return { previousGroups };
		},

		onError: (error, _deviceId, context) => {
			if (context?.previousGroups) {
				queryClient.setQueryData(
					deviceGroupsKeys.lists(),
					context.previousGroups,
				);
			}
			Logger.error("Falha ao alternar o dispositivo no grupo", error);
			toast.error(
				error.message || "Não foi possível alternar o estado do dispositivo.",
			);
		},

		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: deviceGroupsKeys.lists() });
			queryClient.invalidateQueries({ queryKey: ["devices", "list"] });
			queryClient.invalidateQueries({ queryKey: ["dashboard", "rooms"] });
		},
	});
}
