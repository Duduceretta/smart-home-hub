import { useQuery } from "@tanstack/react-query";
import { fetchDevices } from "../api/devices.api";
import { devicesKeys } from "./devices.keys";

export function useDevices() {
    return useQuery({
        queryKey: devicesKeys.lists(),
        queryFn: fetchDevices,
        staleTime: 1000 * 30,
        refetchInterval: 1000 * 15,
    });
}