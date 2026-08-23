import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Logger } from "@/core/logger/app.logger";
import { devicesKeys } from "@/features/devices/hooks/devices.keys";
import { toggleConnectivityRequest } from "../api/dev.api";
import type { ToggleConnectivityPayload } from "../types/dev.types";

/**
 * Forces a device's online/offline status and refreshes its detail/list
 * cache so the change is reflected without a manual reload.
 */
export function useToggleConnectivity() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (payload: ToggleConnectivityPayload) =>
			toggleConnectivityRequest(payload),
		onSuccess: (data, variables) => {
			queryClient.invalidateQueries({ queryKey: devicesKeys.lists() });
			queryClient.invalidateQueries({
				queryKey: devicesKeys.detail(variables.deviceId),
			});
			toast.success(data.message || "Conectividade atualizada!");
		},
		onError: (error: Error) => {
			Logger.error("Falha ao alterar conectividade do dispositivo", error);
			toast.error(error.message || "Não foi possível alterar a conectividade.");
		},
	});
}
