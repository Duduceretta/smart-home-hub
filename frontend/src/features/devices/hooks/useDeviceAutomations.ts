import { useQuery } from "@tanstack/react-query";
import { fetchDeviceAutomations } from "../api/devices.api";
import type { DeviceLinkedAutomation } from "../types/devices.types";
import { devicesKeys } from "./devices.keys";

/** Automações vinculadas a este dispositivo — cruzamento já feito no back-end. */
export function useDeviceAutomations(deviceId: string) {
	return useQuery<DeviceLinkedAutomation[], Error>({
		queryKey: devicesKeys.linkedAutomationsFor(deviceId),
		queryFn: () => fetchDeviceAutomations(deviceId),
		staleTime: 1000 * 60,
		retry: 1,
	});
}
