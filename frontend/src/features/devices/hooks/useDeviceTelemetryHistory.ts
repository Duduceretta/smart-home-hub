import { useQuery } from "@tanstack/react-query";
import { getDeviceTelemetryHistoryRequest } from "../api/devices.api";
import type { TelemetryRange } from "../types/devices.types";
import { devicesKeys } from "./devices.keys";

interface UseDeviceTelemetryHistoryOptions {
	deviceId: string | null;
	range?: TelemetryRange;
	enabled?: boolean;
}

/**
 * Custom hook to fetch and cache historical telemetry data for a specific device.
 */
export function useDeviceTelemetryHistory({
	deviceId,
	range = "24h",
	enabled = true,
}: UseDeviceTelemetryHistoryOptions) {
	return useQuery({
		queryKey: devicesKeys.telemetry(deviceId ?? "", range),
		queryFn: () =>
			getDeviceTelemetryHistoryRequest({
				id: deviceId as string,
				range,
			}),
		enabled: Boolean(deviceId) && enabled,
		staleTime: 1000 * 30,
		refetchOnWindowFocus: false,
	});
}
