import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { AppError } from "@/core/errors/app.errors";
import { Logger } from "@/core/logger/app.logger";
import { setDeviceColorRequest } from "../api/devices.api";
import { devicesKeys } from "./devices.keys";

export function useSetDeviceColor() {
	const queryClient = useQueryClient();

	return useMutation<void, AppError, { deviceId: string; colorHex: string }>({
		mutationFn: setDeviceColorRequest,

		onError: (error) => {
			Logger.error("Falha ao ajustar a cor do dispositivo", error);
			toast.error("Não foi possível ajustar a cor do dispositivo", {
				description: error.message,
			});
		},

		onSettled: (_data, _error, { deviceId }) => {
			// supportsColor pode ter sido auto-detectado no back-end nesta
			// chamada (ver SetDeviceColorCommand) — invalida o detalhe pra
			// refletir isso sem esperar o próximo refetch natural.
			queryClient.invalidateQueries({ queryKey: devicesKeys.detail(deviceId) });
		},
	});
}
