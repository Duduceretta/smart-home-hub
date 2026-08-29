import { useQuery } from "@tanstack/react-query";
import { fetchAssignableDevices } from "../api/rooms.api";
import type { RoomPickerDevice } from "../types/rooms.types";
import { roomsKeys } from "./rooms.keys";

/**
 * Fetches the full device list, used both by the assignment picker inside
 * `RoomFormDialog` and to derive per-room device counts/grids across the
 * Rooms screen. No refetchInterval — form-scoped/derived data, not a live
 * polling grid.
 */
export function useAssignableDevices() {
	return useQuery<RoomPickerDevice[], Error>({
		queryKey: roomsKeys.pickerDevices(),
		queryFn: fetchAssignableDevices,
		staleTime: 1000 * 60,
		retry: 1,
	});
}
