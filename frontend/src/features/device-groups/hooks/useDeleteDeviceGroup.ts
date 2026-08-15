import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Logger } from "@/core/logger/app.logger";
import { deleteDeviceGroupRequest } from "../api/device-groups.api";
import { deviceGroupsKeys } from "./device-groups.keys";

/**
 * Custom Hook for performing logical deletion of a device group.
 * Revalidates group lists to immediately refresh the grid.
 */
export function useDeleteDeviceGroup() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (id: string) => deleteDeviceGroupRequest(id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: deviceGroupsKeys.lists() });
			toast.success("Grupo removido com sucesso!");
		},
		onError: (error: Error) => {
			Logger.error("Falha ao remover o grupo de dispositivos", error);
			toast.error(error.message || "Não foi possível remover o grupo.");
		},
	});
}
