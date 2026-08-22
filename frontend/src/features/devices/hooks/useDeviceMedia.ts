import { useQuery } from "@tanstack/react-query";
import { getDeviceMediaStateRequest } from "../api/devices.api";
import type { DeviceMediaState } from "../types/devices.types";
import { devicesKeys } from "./devices.keys";

interface UseDeviceMediaOptions {
	enabled?: boolean;
}

/**
 * Live volume/now-playing state of a TV. Fetched once on mount (no
 * client-side polling) — continuous updates arrive via the SignalR
 * "DeviceMediaChanged" event handled in useRealtimeListener.
 */
export function useDeviceMedia(
	deviceId: string | undefined,
	{ enabled = true }: UseDeviceMediaOptions = {},
) {
	return useQuery<DeviceMediaState, Error>({
		queryKey: devicesKeys.media(deviceId ?? ""),
		queryFn: () => getDeviceMediaStateRequest(deviceId as string),
		enabled: Boolean(deviceId) && enabled,
		staleTime: 1000 * 30,
		refetchOnWindowFocus: false,
	});
}
