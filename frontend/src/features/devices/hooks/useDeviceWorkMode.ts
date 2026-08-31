import { useQuery } from "@tanstack/react-query";
import { fetchDeviceWorkMode } from "../api/devices.api";
import type { DeviceWorkMode } from "../types/devices.types";
import { devicesKeys } from "./devices.keys";

/**
 * Consulta síncrona ao hardware real, sem cache-first agressivo — usada só
 * na abertura do painel de detalhe, pra abrir já na aba certa (Branco/Cor).
 */
export function useDeviceWorkMode(deviceId: string, enabled: boolean) {
	return useQuery<DeviceWorkMode, Error>({
		queryKey: devicesKeys.workMode(deviceId),
		queryFn: () => fetchDeviceWorkMode(deviceId),
		enabled: Boolean(deviceId) && enabled,
		staleTime: 0,
		retry: 1,
		refetchOnWindowFocus: false,
	});
}
