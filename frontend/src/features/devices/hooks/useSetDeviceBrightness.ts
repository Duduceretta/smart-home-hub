import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { AppError } from "@/core/errors/app.errors";
import { Logger } from "@/core/logger/app.logger";
import { setDeviceBrightnessRequest } from "../api/devices.api";
import { devicesKeys } from "./devices.keys";

/**
 * Commit-on-release (não uma chamada por pixel arrastado) — o componente
 * chamador dispara isso só no `onPointerUp`/soltar do slider, mantendo o
 * estado local durante o arraste. Sem optimistic update aqui: o valor
 * confirmado (com o range real 0-100 sanitizado pelo backend) só volta no
 * refetch — a UI só otimista localmente o gesto de arraste em si, via
 * `useSyncedDeviceControl` no componente chamador.
 *
 * Invalida os DOIS lugares de onde `device.brightness` pode ter vindo:
 * `devicesKeys.detail` (o painel de detalhe, `useDevice`) e
 * `devicesKeys.lists()` (o card da grade/Dashboard, `useDevices`) — mesmo
 * dispositivo, duas fontes de cache possíveis, mesmo padrão de
 * `useToggleDevice`.
 */
export function useSetDeviceBrightness() {
	const queryClient = useQueryClient();

	return useMutation<
		void,
		AppError,
		{ deviceId: string; brightnessPercent: number }
	>({
		mutationFn: setDeviceBrightnessRequest,

		onError: (error) => {
			Logger.error("Falha ao ajustar o brilho do dispositivo", error);
			toast.error("Não foi possível ajustar o brilho do dispositivo", {
				description: error.message,
			});
		},

		onSettled: (_data, _error, { deviceId }) => {
			queryClient.invalidateQueries({ queryKey: devicesKeys.detail(deviceId) });
			queryClient.invalidateQueries({ queryKey: devicesKeys.lists() });
		},
	});
}
