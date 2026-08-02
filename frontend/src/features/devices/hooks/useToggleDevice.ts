import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Logger } from "@/core/logger/app.logger";
import { toggleDeviceRequest } from "../api/devices.api";
import type { Device, ToggleDeviceResponse } from "../types/devices.types";
import { devicesKeys } from "./devices.keys";

interface ToggleContext {
	previousDevices?: Device[];
}

export function useToggleDevice() {
	const queryClient = useQueryClient();

	return useMutation<ToggleDeviceResponse, Error, string, ToggleContext>({
		mutationFn: (deviceId: string) => toggleDeviceRequest(deviceId),

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

		onError: (error, _deviceId, context) => {
			if (context?.previousDevices) {
				queryClient.setQueryData(devicesKeys.lists(), context.previousDevices);
			}
			Logger.error("Falha ao alternar estado do dispositivo", error);
			toast.error(
				error.message || "Não foi possível alterar o estado do dispositivo.",
			);
		},

		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: devicesKeys.lists() });
		},
	});
}
