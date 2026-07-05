import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchDeviceById } from "../api/devices.api";
import type { Device } from "../types/devices.types";
import { devicesKeys } from "./devices.keys";

export function useDevice(id: string) {
	const queryClient = useQueryClient();

	return useQuery<Device, Error>({
		queryKey: devicesKeys.detail(id),
		queryFn: () => fetchDeviceById(id),
		enabled: Boolean(id),
		staleTime: 1000 * 60 * 5,

		initialData: () => {
			const cachedLists = queryClient.getQueryData<Device[]>(
				devicesKeys.lists(),
			);
			return cachedLists?.find((device) => device.id === id);
		},
		initialDataUpdatedAt: () => {
			return queryClient.getQueryState(devicesKeys.lists())?.dataUpdatedAt;
		},
	});
}
