import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { createSignalRConnection } from "@/core/lib/signalr";
import { Logger } from "@/core/logger/app.logger";
import type { PagedResponse } from "@/core/types/pagination.types";
import { useAuthStore } from "@/features/auth/store/useAuthStore";
import { dashboardKeys } from "@/features/dashboard/hooks/dashboard.keys";
import { devicesKeys } from "@/features/devices/hooks/devices.keys";
import type {
	Device,
	DeviceMediaState,
} from "@/features/devices/types/devices.types";

interface DeviceStatusChangedPayload {
	deviceId: string;
	isOn: boolean;
	isOnline: boolean;
}

interface DeviceMediaChangedPayload extends DeviceMediaState {
	deviceId: string;
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

				queryClient.setQueriesData<PagedResponse<Device>>(
					{ queryKey: devicesKeys.lists() },
					(oldData) => {
						if (!oldData) return oldData;
						return {
							...oldData,
							items: oldData.items.map((device) =>
								device.id === payload.deviceId
									? {
											...device,
											isOn: payload.isOn,
											isOnline: payload.isOnline,
										}
									: device,
							),
						};
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
			"DeviceMediaChanged",
			(payload: DeviceMediaChangedPayload) => {
				Logger.info("Evento SignalR: DeviceMediaChanged", payload);

				queryClient.setQueryData<DeviceMediaState>(
					devicesKeys.media(payload.deviceId),
					{
						volumePercent: payload.volumePercent,
						isPlaying: payload.isPlaying,
						title: payload.title,
						artist: payload.artist,
					},
				);
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

		// Eventos perdidos durante uma queda de conexão nunca são reenviados pelo
		// SignalR (Clients.Group(...).SendAsync é fire-and-forget, sem fila/replay).
		// Ao reconectar, força um refetch para reconciliar qualquer mudança de
		// estado (ex: TV ligada/desligada pelo controle remoto) ocorrida enquanto
		// a conexão estava fora do ar.
		connection.onreconnecting((error) => {
			Logger.warn("Conexão SignalR caiu, tentando reconectar...", error);
		});

		connection.onreconnected(() => {
			Logger.info("Conexão SignalR restabelecida — reconciliando estado.");
			queryClient.invalidateQueries({ queryKey: devicesKeys.lists() });
			queryClient.invalidateQueries({ queryKey: devicesKeys.medias() });
			queryClient.invalidateQueries({ queryKey: dashboardKeys.overview() });
		});

		connection.onclose((error) => {
			Logger.error("Conexão SignalR encerrada definitivamente", error);
		});

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
