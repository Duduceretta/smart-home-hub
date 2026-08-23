import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Logger } from "@/core/logger/app.logger";
import { dashboardKeys } from "@/features/dashboard/hooks/dashboard.keys";
import { devicesKeys } from "@/features/devices/hooks/devices.keys";
import { emitTelemetryRequest } from "../api/dev.api";
import type { EmitTelemetryPayload } from "../types/dev.types";

/**
 * Emits simulated telemetry for a device and refreshes its detail/telemetry
 * cache plus the dashboard overview.
 */
export function useEmitTelemetry() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (payload: EmitTelemetryPayload) =>
			emitTelemetryRequest(payload),
		onSuccess: (data, variables) => {
			queryClient.invalidateQueries({
				queryKey: devicesKeys.detail(variables.deviceId),
			});
			queryClient.invalidateQueries({ queryKey: devicesKeys.telemetries() });
			queryClient.invalidateQueries({ queryKey: dashboardKeys.overview() });
			toast.success(data.message || "Telemetria simulada emitida!");
		},
		onError: (error: Error) => {
			Logger.error("Falha ao emitir telemetria simulada", error);
			toast.error(error.message || "Não foi possível emitir a telemetria.");
		},
	});
}
