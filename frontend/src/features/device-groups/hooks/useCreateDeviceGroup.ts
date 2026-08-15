import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Logger } from "@/core/logger/app.logger";
import { createDeviceGroupRequest } from "../api/device-groups.api";
import type { CreateDeviceGroupPayload } from "../types/device-groups.types";
import { deviceGroupsKeys } from "./device-groups.keys";

/**
 * Custom Hook for creating a new device group.
 * Automatically invalidates group lists on success and presents user feedback.
 */
export function useCreateDeviceGroup() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (payload: CreateDeviceGroupPayload) =>
			createDeviceGroupRequest(payload),
		onSuccess: (data) => {
			queryClient.invalidateQueries({ queryKey: deviceGroupsKeys.lists() });
			toast.success(data.message || "Grupo criado com sucesso!");
		},
		onError: (error: Error) => {
			Logger.error("Falha ao criar o grupo de dispositivos", error);
			toast.error(error.message || "Não foi possível criar o grupo.");
		},
	});
}
