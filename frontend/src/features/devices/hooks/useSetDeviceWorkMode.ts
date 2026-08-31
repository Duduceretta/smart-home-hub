import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { AppError } from "@/core/errors/app.errors";
import { Logger } from "@/core/logger/app.logger";
import { setDeviceWorkModeRequest } from "../api/devices.api";
import { devicesKeys } from "./devices.keys";

export function useSetDeviceWorkMode() {
	const queryClient = useQueryClient();

	return useMutation<
		void,
		AppError,
		{ deviceId: string; workMode: "white" | "colour" }
	>({
		mutationFn: setDeviceWorkModeRequest,

		onError: (error) => {
			Logger.error("Falha ao trocar o modo do dispositivo", error);
			toast.error("Não foi possível trocar o modo do dispositivo", {
				description: error.message,
			});
		},

		onSettled: (_data, _error, { deviceId }) => {
			queryClient.invalidateQueries({
				queryKey: devicesKeys.workMode(deviceId),
			});
		},
	});
}
