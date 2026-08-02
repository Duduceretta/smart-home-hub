import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Logger } from "@/core/logger/app.logger";
import { deleteDeviceRequest } from "../api/devices.api";
import { devicesKeys } from "./devices.keys";

export function useDeleteDevice() {
	const queryClient = useQueryClient();

	return useMutation<void, Error, string>({
		mutationFn: (id: string) => deleteDeviceRequest(id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: devicesKeys.lists() });
			toast.success("Dispositivo removido com sucesso!");
		},
		onError: (error: Error) => {
			Logger.error("Falha ao excluir o dispositivo", error);
			toast.error(error.message || "Não foi possível excluir o dispositivo.");
		},
	});
}
