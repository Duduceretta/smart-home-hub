import { useQuery } from "@tanstack/react-query";
import { fetchPickerDevices } from "../api/picker-devices.api";
import type { PickerDevice } from "../types/device-groups.types";
import { deviceGroupsKeys } from "./device-groups.keys";

/**
 * Custom Hook to fetch the device list used by the group's device picker.
 * No refetchInterval — unlike the devices feature's live grid, a form-scoped
 * picker doesn't need to poll while the sheet is open.
 */
export function usePickerDevices() {
	return useQuery<PickerDevice[], Error>({
		queryKey: deviceGroupsKeys.pickerDevices(),
		queryFn: fetchPickerDevices,
		staleTime: 1000 * 60,
		retry: 1,
	});
}
