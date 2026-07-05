import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/core/api/api.client";
import { Logger } from "@/core/logger/app.logger";
import { devicesKeys } from "./devices.keys";

export function useDeleteDevice() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (id: string) => {
			await apiClient.delete(`/devices/${id}`);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: devicesKeys.lists() });
			toast.success("Dispositivo removido com sucesso!");
		},
		onError: (error) => {
			Logger.error("Falha ao excluir dispositivo", error);
			toast.error("Não foi possível excluir o dispositivo. Tente novamente.");
		},
	});
}
