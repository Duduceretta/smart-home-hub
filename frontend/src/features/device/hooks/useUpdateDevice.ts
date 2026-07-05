import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateDeviceRequest } from "../api/devices.api";
import type { UpdateDevicePayload } from "../types/devices.types";
import { devicesKeys } from "./devices.keys";

export function useUpdateDevice() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (data: { id: string; payload: UpdateDevicePayload }) =>
			updateDeviceRequest(data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: devicesKeys.lists() });
		},
	});
}
