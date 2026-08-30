import { useQuery } from "@tanstack/react-query";
import { fetchDeviceActivityLog } from "../api/devices.api";
import type { DeviceActivityEntry } from "../types/devices.types";
import { devicesKeys } from "./devices.keys";

/** Eventos recentes deste dispositivo — filtro feito no back-end. */
export function useDeviceActivityLog(deviceId: string) {
	return useQuery<DeviceActivityEntry[], Error>({
		queryKey: devicesKeys.activityLog(deviceId),
		queryFn: () => fetchDeviceActivityLog(deviceId),
		staleTime: 1000 * 30,
		retry: 1,
	});
}
