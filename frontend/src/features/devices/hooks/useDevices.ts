import { useQuery } from "@tanstack/react-query";
import type { PagedResponse } from "@/core/types/pagination.types";
import { fetchDevices } from "../api/devices.api";
import type { Device } from "../types/devices.types";
import { type DevicesListFilters, devicesKeys } from "./devices.keys";

export function useDevices(filters: DevicesListFilters = {}) {
	return useQuery<PagedResponse<Device>, Error>({
		queryKey: devicesKeys.list(filters),
		queryFn: () => fetchDevices(filters),
		staleTime: 1000 * 30,
	});
}
