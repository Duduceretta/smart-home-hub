import { useQuery } from "@tanstack/react-query";
import { fetchPickerDevices } from "../api/picker-devices.api";
import type { PickerDevice } from "../types/automations.types";
import { automationsKeys } from "./automations.keys";

/**
 * Custom Hook to fetch the device list used by the automation form's
 * trigger/condition/action pickers. No refetchInterval — a form-scoped
 * picker doesn't need to poll while the sheet is open.
 */
export function usePickerDevices() {
	return useQuery<PickerDevice[], Error>({
		queryKey: automationsKeys.pickerDevices(),
		queryFn: fetchPickerDevices,
		staleTime: 1000 * 60,
		retry: 1,
	});
}
