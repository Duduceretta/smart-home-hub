import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toggleDeviceRequest } from "../api/devices.api";
import type { Device } from "../types/devices.types";
import { devicesKeys } from "./devices.keys";

export function useToggleDevice() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: toggleDeviceRequest,

		onMutate: async (deviceId: string) => {
			await queryClient.cancelQueries({ queryKey: devicesKeys.lists() });

			const previousDevices = queryClient.getQueryData<Device[]>(
				devicesKeys.lists(),
			);

			if (previousDevices) {
				queryClient.setQueryData<Device[]>(
					devicesKeys.lists(),
					previousDevices.map((d) =>
						d.id === deviceId ? { ...d, isOn: !d.isOn } : d,
					),
				);
			}

			return { previousDevices };
		},

		onError: (_err, _deviceId, context) => {
			if (context?.previousDevices) {
				queryClient.setQueryData(devicesKeys.lists(), context.previousDevices);
			}
		},

		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: devicesKeys.lists() });
		},
	});
}
