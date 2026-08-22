import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { AppError } from "@/core/errors/app.errors";
import { Logger } from "@/core/logger/app.logger";
import { setDeviceVolumeRequest } from "../api/devices.api";
import { devicesKeys } from "./devices.keys";

export function useSetDeviceVolume() {
	const queryClient = useQueryClient();

	return useMutation<void, AppError, { deviceId: string; volume: number }>({
		mutationFn: setDeviceVolumeRequest,

		onError: (error) => {
			Logger.error("Falha ao ajustar o volume da TV", error);
			toast.error("Não foi possível ajustar o volume da TV", {
				description: error.message,
			});
		},

		onSettled: (_data, _error, { deviceId }) => {
			queryClient.invalidateQueries({ queryKey: devicesKeys.media(deviceId) });
		},
	});
}
