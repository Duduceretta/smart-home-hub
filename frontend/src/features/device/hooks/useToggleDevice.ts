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

			queryClient.setQueryData<Device[]>(devicesKeys.lists(), (old = []) =>
				old.map((device) =>
					device.id === deviceId ? { ...device, isOn: !device.isOn } : device,
				),
			);

			return { previousDevices };
		},

		onError: (_error, _deviceId, context) => {
			if (context?.previousDevices) {
				queryClient.setQueryData(devicesKeys.lists(), context.previousDevices);
			}
		},

		onSettled: (_data, _error, deviceId) => {
			queryClient.invalidateQueries({ queryKey: devicesKeys.lists() });
			queryClient.invalidateQueries({ queryKey: devicesKeys.detail(deviceId) });
			queryClient.invalidateQueries({ queryKey: ["dashboard", "overview"] });
		},
	});
}
