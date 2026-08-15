import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Logger } from "@/core/logger/app.logger";
import { updateDeviceGroupRequest } from "../api/device-groups.api";
import type { UpdateDeviceGroupPayload } from "../types/device-groups.types";
import { deviceGroupsKeys } from "./device-groups.keys";

interface UpdateDeviceGroupArgs {
	id: string;
	payload: UpdateDeviceGroupPayload;
}

/**
 * Custom Hook for updating an existing device group.
 * The PUT response only echoes back the submitted payload (no nested device
 * details), so the updated card content relies on the invalidated refetch,
 * not on the mutation's return value.
 */
export function useUpdateDeviceGroup() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ id, payload }: UpdateDeviceGroupArgs) =>
			updateDeviceGroupRequest({ id, payload }),
		onSuccess: (updatedGroup) => {
			queryClient.invalidateQueries({ queryKey: deviceGroupsKeys.lists() });
			queryClient.invalidateQueries({
				queryKey: deviceGroupsKeys.detail(updatedGroup.id),
			});
			toast.success("Grupo atualizado com sucesso!");
		},
		onError: (error: Error) => {
			Logger.error("Falha ao atualizar o grupo de dispositivos", error);
			toast.error(error.message || "Não foi possível atualizar o grupo.");
		},
	});
}
