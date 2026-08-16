import { useQuery } from "@tanstack/react-query";
import { fetchDevices } from "../api/devices.api";
import type { Device } from "../types/devices.types";
import { type DevicesListFilters, devicesKeys } from "./devices.keys";

export function useDevices(filters: DevicesListFilters = {}) {
	return useQuery<Device[], Error>({
		queryKey: devicesKeys.list(filters),
		queryFn: () => fetchDevices(filters),
		staleTime: 1000 * 30,
	});
}
