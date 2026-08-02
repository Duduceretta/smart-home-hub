import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Logger } from "@/core/logger/app.logger";
import { updateDeviceRequest } from "../api/devices.api";
import type { Device, UpdateDevicePayload } from "../types/devices.types";
import { devicesKeys } from "./devices.keys";

export function useUpdateDevice() {
	const queryClient = useQueryClient();

	return useMutation<
		Partial<Device>,
		Error,
		{ id: string; payload: UpdateDevicePayload }
	>({
		mutationFn: ({ id, payload }) => updateDeviceRequest({ id, payload }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: devicesKeys.lists() });
			toast.success("Dispositivo atualizado com sucesso!");
		},
		onError: (error: Error) => {
			Logger.error("Falha ao atualizar o dispositivo", error);
			toast.error(error.message || "Não foi possível atualizar o dispositivo.");
		},
	});
}
