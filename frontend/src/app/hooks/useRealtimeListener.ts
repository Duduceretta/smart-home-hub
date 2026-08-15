import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { createSignalRConnection } from "@/core/lib/signalr";
import { Logger } from "@/core/logger/app.logger";
import { useAuthStore } from "@/features/auth/store/useAuthStore";
import { dashboardKeys } from "@/features/dashboard/hooks/dashboard.keys";
import { devicesKeys } from "@/features/devices/hooks/devices.keys";
import type { Device } from "@/features/devices/types/devices.types";

interface DeviceStatusChangedPayload {
	deviceId: string;
	isOn: boolean;
	isOnline: boolean;
}

interface TelemetryReceivedPayload {
	deviceId: string;
	powerUsageWatts: number | null;
	temperatureCelsius: number | null;
	timestamp: string;
}

export function useRealtimeListener(): void {
	const user = useAuthStore((state) => state.user);
	const isLoading = useAuthStore((state) => state.isLoading);
	const queryClient = useQueryClient();

	useEffect(() => {
		if (isLoading || !user) return;

		const connection = createSignalRConnection();

		connection.on(
			"DeviceStatusChanged",
			(payload: DeviceStatusChangedPayload) => {
				Logger.info("Evento SignalR: DeviceStatusChanged", payload);

				queryClient.setQueriesData<Device[]>(
					{ queryKey: devicesKeys.lists() },
					(oldDevices) => {
						if (!oldDevices) return oldDevices;
						return oldDevices.map((device) =>
							device.id === payload.deviceId
								? {
										...device,
										isOn: payload.isOn,
										isOnline: payload.isOnline,
									}
								: device,
						);
					},
				);

				queryClient.invalidateQueries({
					queryKey: devicesKeys.detail(payload.deviceId),
				});
				queryClient.invalidateQueries({
					queryKey: dashboardKeys.overview(),
				});
			},
		);

		connection.on(
			"ReceiveTelemetryUpdate",
			(payload: TelemetryReceivedPayload) => {
				Logger.info("Evento SignalR: ReceiveTelemetryUpdate", payload);

				queryClient.invalidateQueries({
					queryKey: dashboardKeys.overview(),
				});
			},
		);

		connection
			.start()
			.then(() => {
				Logger.info("Conexão SignalR iniciada com sucesso.");
			})
			.catch((error: unknown) => {
				Logger.error("Falha ao conectar ao SignalR Hub", error);
			});

		return () => {
			connection.stop().catch((error: unknown) => {
				Logger.warn("Erro ao encerrar conexão SignalR de forma limpa", error);
			});
		};
	}, [user, isLoading, queryClient]);
}
