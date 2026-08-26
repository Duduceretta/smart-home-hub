import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
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
import { integrationsKeys } from "@/features/integrations/hooks/integrations.keys";
import type { SpotifyPlaybackState } from "@/features/integrations/types/integrations.types";

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
	const telemetryDebounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

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
				queryClient.invalidateQueries({
					queryKey: dashboardKeys.activityLogs(),
				});
			},
		);

		connection.on(
			"DeviceMediaChanged",
			(payload: DeviceMediaChangedPayload) => {
				Logger.info("Evento SignalR: DeviceMediaChanged", payload);

				const previousMedia = queryClient.getQueryData<DeviceMediaState>(
					devicesKeys.media(payload.deviceId),
				);

				queryClient.setQueryData<DeviceMediaState>(
					devicesKeys.media(payload.deviceId),
					{
						volumePercent: payload.volumePercent,
						isPlaying: payload.isPlaying,
						title: payload.title,
						artist: payload.artist,
					},
				);

				if (payload.title && previousMedia?.title !== payload.title) {
					queryClient.invalidateQueries({
						queryKey: dashboardKeys.activityLogs(),
					});
				}
			},
		);

		connection.on("SpotifyPlaybackChanged", (payload: SpotifyPlaybackState) => {
			Logger.info("Evento SignalR: SpotifyPlaybackChanged", payload);

			const previousPlayback = queryClient.getQueryData<SpotifyPlaybackState>(
				integrationsKeys.spotifyPlayback(),
			);

			queryClient.setQueryData<SpotifyPlaybackState>(
				integrationsKeys.spotifyPlayback(),
				payload,
			);

			if (
				payload.title &&
				(previousPlayback?.title !== payload.title ||
					previousPlayback?.isPlaying !== payload.isPlaying)
			) {
				queryClient.invalidateQueries({
					queryKey: dashboardKeys.activityLogs(),
				});
			}
		});

		connection.on(
			"ReceiveTelemetryUpdate",
			(payload: TelemetryReceivedPayload) => {
				Logger.info("Evento SignalR: ReceiveTelemetryUpdate", payload);

				// Telemetria chega em rajada — um único tick do worker mock dispara
				// um evento por dispositivo (dezenas em poucos ms), e cada
				// invalidateQueries dispara um refetch. Sem debounce, isso vira uma
				// rajada de requisições HTTP simultâneas pra /dashboard/overview a
				// cada ciclo. O dashboard não precisa de precisão sub-segundo (o
				// gráfico agrega em baldes de 5 min), só coalescer as invalidações
				// do burst numa única, após um breve período de silêncio.
				clearTimeout(telemetryDebounceRef.current);
				telemetryDebounceRef.current = setTimeout(() => {
					queryClient.invalidateQueries({
						queryKey: dashboardKeys.overview(),
					});
				}, 800);
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
			queryClient.invalidateQueries({
				queryKey: integrationsKeys.spotifyPlayback(),
			});
			queryClient.invalidateQueries({ queryKey: dashboardKeys.overview() });
			queryClient.invalidateQueries({ queryKey: dashboardKeys.activityLogs() });
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
			clearTimeout(telemetryDebounceRef.current);
			connection.stop().catch((error: unknown) => {
				Logger.warn("Erro ao encerrar conexão SignalR de forma limpa", error);
			});
		};
	}, [user, isLoading, queryClient]);
}
