import { useQuery } from "@tanstack/react-query";
import { fetchDeviceEnergy } from "../api/devices.api";
import type { DeviceEnergy, DeviceEnergyRange } from "../types/devices.types";
import { devicesKeys } from "./devices.keys";

export function useDeviceEnergy(deviceId: string, range: DeviceEnergyRange) {
	return useQuery<DeviceEnergy, Error>({
		queryKey: devicesKeys.energy(deviceId, range),
		queryFn: () => fetchDeviceEnergy(deviceId, range),
		staleTime: 1000 * 30,
		retry: 1,
	});
}
