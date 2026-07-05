import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createDeviceRequest } from "../api/devices.api";
import type {
	CreateDevicePayload,
	CreateDeviceResponse,
} from "../types/devices.types";
import { devicesKeys } from "./devices.keys";

export function useCreateDevice() {
	const queryClient = useQueryClient();

	return useMutation<CreateDeviceResponse, Error, CreateDevicePayload>({
		mutationFn: createDeviceRequest,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: devicesKeys.lists() });
		},
	});
}
