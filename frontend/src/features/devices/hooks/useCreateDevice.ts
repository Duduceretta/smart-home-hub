import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Logger } from "@/core/logger/app.logger";
import { createDeviceRequest } from "../api/devices.api";
import type {
	CreateDevicePayload,
	CreateDeviceResponse,
} from "../types/devices.types";
import { devicesKeys } from "./devices.keys";

export function useCreateDevice() {
	const queryClient = useQueryClient();

	return useMutation<CreateDeviceResponse, Error, CreateDevicePayload>({
		mutationFn: (payload: CreateDevicePayload) => createDeviceRequest(payload),
		onSuccess: (data) => {
			queryClient.invalidateQueries({ queryKey: devicesKeys.lists() });
			toast.success(data.message || "Dispositivo criado com sucesso!");
		},
		onError: (error: Error) => {
			Logger.error("Falha ao criar o dispositivo", error);
			toast.error(error.message || "Não foi possível criar o dispositivo.");
		},
	});
}
