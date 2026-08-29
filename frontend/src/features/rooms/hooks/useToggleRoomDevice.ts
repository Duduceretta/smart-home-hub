import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { AppError } from "@/core/errors/app.errors";
import { Logger } from "@/core/logger/app.logger";
import { toggleRoomDeviceRequest } from "../api/rooms.api";
import type { RoomPickerDevice } from "../types/rooms.types";
import { roomsKeys } from "./rooms.keys";

interface ToggleContext {
	previousDevices?: RoomPickerDevice[];
}

/**
 * Toggles a device's on/off state from the `RoomDetailPanel` device grid.
 * Optimistic update + rollback on `roomsKeys.pickerDevices()`, mirroring
 * `useToggleDevice` in the `devices` feature. Also invalidates the Devices
 * feature's own device-list cache key by its literal value (["devices",
 * "list"]) instead of importing `devicesKeys` — same device toggled from two
 * screens must not leave either one's cache stale, without breaking FSD
 * isolation by importing across features.
 */
export function useToggleRoomDevice() {
	const queryClient = useQueryClient();

	return useMutation<void, AppError, string, ToggleContext>({
		mutationFn: (deviceId: string) => toggleRoomDeviceRequest(deviceId),

		onMutate: async (deviceId: string) => {
			await queryClient.cancelQueries({ queryKey: roomsKeys.pickerDevices() });

			const previousDevices = queryClient.getQueryData<RoomPickerDevice[]>(
				roomsKeys.pickerDevices(),
			);

			if (previousDevices) {
				queryClient.setQueryData<RoomPickerDevice[]>(
					roomsKeys.pickerDevices(),
					previousDevices.map((device) =>
						device.id === deviceId ? { ...device, isOn: !device.isOn } : device,
					),
				);
			}

			return { previousDevices };
		},

		onError: (error, _deviceId, context) => {
			if (context?.previousDevices) {
				queryClient.setQueryData(
					roomsKeys.pickerDevices(),
					context.previousDevices,
				);
			}
			Logger.error("Falha ao alternar o dispositivo", error);
			toast.error(error.message || "Não foi possível alternar o dispositivo.");
		},

		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: roomsKeys.pickerDevices() });
			queryClient.invalidateQueries({ queryKey: ["devices", "list"] });
		},
	});
}
