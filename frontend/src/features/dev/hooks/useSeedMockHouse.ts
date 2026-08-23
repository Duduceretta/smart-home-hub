import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Logger } from "@/core/logger/app.logger";
import { dashboardKeys } from "@/features/dashboard/hooks/dashboard.keys";
import { devicesKeys } from "@/features/devices/hooks/devices.keys";
import { roomsKeys } from "@/features/rooms/hooks/rooms.keys";
import { seedMockHouseRequest } from "../api/dev.api";

/**
 * Generates a mock house (rooms + devices) and refreshes every screen
 * affected by the new data (devices list, dashboard overview, rooms list).
 */
export function useSeedMockHouse() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: seedMockHouseRequest,
		onSuccess: (data) => {
			queryClient.invalidateQueries({ queryKey: devicesKeys.lists() });
			queryClient.invalidateQueries({ queryKey: dashboardKeys.overview() });
			queryClient.invalidateQueries({ queryKey: roomsKeys.lists() });
			toast.success(
				`Casa mock gerada: ${data.roomsCreated} ambientes, ${data.devicesCreated} dispositivos.`,
			);
		},
		onError: (error: Error) => {
			Logger.error("Falha ao gerar a casa mock", error);
			toast.error(error.message || "Não foi possível gerar a casa mock.");
		},
	});
}
