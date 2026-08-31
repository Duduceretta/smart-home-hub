import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { AppError } from "@/core/errors/app.errors";
import { Logger } from "@/core/logger/app.logger";
import { setDeviceBrightnessRequest } from "../api/devices.api";
import { devicesKeys } from "./devices.keys";

/**
 * Commit-on-release (não uma chamada por pixel arrastado) — o componente
 * chamador dispara isso só no `onPointerUp`/soltar do slider, mantendo o
 * estado local durante o arraste. Sem optimistic update aqui: brilho não
 * tem um campo próprio no `Device` (é write-only, não reflete de volta no
 * GET), então não há cache pra atualizar otimisticamente — só o toast de
 * erro em caso de falha, mesmo padrão de `useSetDeviceVolume`.
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
		},
	});
}
