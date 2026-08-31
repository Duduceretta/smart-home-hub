import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { AppError } from "@/core/errors/app.errors";
import { Logger } from "@/core/logger/app.logger";
import { setDeviceColorTempRequest } from "../api/devices.api";
import { devicesKeys } from "./devices.keys";

export function useSetDeviceColorTemp() {
	const queryClient = useQueryClient();

	return useMutation<
		void,
		AppError,
		{ deviceId: string; colorTempPercent: number }
	>({
		mutationFn: setDeviceColorTempRequest,

		onError: (error) => {
			Logger.error(
				"Falha ao ajustar a temperatura de cor do dispositivo",
				error,
			);
			toast.error(
				"Não foi possível ajustar a temperatura de cor do dispositivo",
				{
					description: error.message,
				},
			);
		},

		onSettled: (_data, _error, { deviceId }) => {
			queryClient.invalidateQueries({
				queryKey: devicesKeys.workMode(deviceId),
			});
		},
	});
}
