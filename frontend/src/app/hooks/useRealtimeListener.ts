import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import {
	createSignalRConnection,
	setActiveHubConnection,
} from "@/core/lib/signalr";
import { Logger } from "@/core/logger/app.logger";
import type { PagedResponse } from "@/core/types/pagination.types";
import { useAuthStore } from "@/features/auth/store/useAuthStore";
import { automationsKeys } from "@/features/automations/hooks/automations.keys";
import { dashboardKeys } from "@/features/dashboard/hooks/dashboard.keys";
import { deviceGroupsKeys } from "@/features/device-groups/hooks/device-groups.keys";
import type { DeviceGroup } from "@/features/device-groups/types/device-groups.types";
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

interface AutomationExecutionResultPayload {
	automationId: string;
	deviceId: string;
	success: boolean;
	errorMessage: string | null;
	traceId: string;
}

/**
 * Eco de arraste de slider contínuo (brilho/cor/temperatura de cor) de UM
 * dispositivo, emitido por OUTRO cliente conectado com a mesma conta —
 * campos ausentes = não fazem parte deste frame (só o campo sendo
 * arrastado no momento é enviado). Puramente visual: nunca dispara
 * invalidação/refetch, só espelha a posição do slider.
 */
interface DeviceControlPreviewPayload {
	deviceId: string;
	brightnessPercent?: number;
	colorHex?: string;
	colorTempPercent?: number;
}

/** Mesmo racional de DeviceControlPreviewPayload, para o slider mestre de brilho coletivo de um grupo de dispositivos. */
interface GroupControlPreviewPayload {
	groupId: string;
	brightnessPercent?: number;
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

		connection.on(
			"DeviceControlPreview",
			(payload: DeviceControlPreviewPayload) => {
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
											brightness:
												payload.brightnessPercent ?? device.brightness,
											colorHex: payload.colorHex ?? device.colorHex,
											colorTempPercent:
												payload.colorTempPercent ?? device.colorTempPercent,
										}
									: device,
							),
						};
					},
				);

				queryClient.setQueryData<Device>(
					devicesKeys.detail(payload.deviceId),
					(oldDevice) => {
						if (!oldDevice) return oldDevice;
						return {
							...oldDevice,
							brightness: payload.brightnessPercent ?? oldDevice.brightness,
							colorHex: payload.colorHex ?? oldDevice.colorHex,
							colorTempPercent:
								payload.colorTempPercent ?? oldDevice.colorTempPercent,
						};
					},
				);
			},
		);

		connection.on(
			"GroupControlPreview",
			(payload: GroupControlPreviewPayload) => {
				const { brightnessPercent } = payload;
				if (brightnessPercent === undefined) return;

				queryClient.setQueriesData<DeviceGroup[]>(
					{ queryKey: deviceGroupsKeys.lists() },
					(oldData) => {
						if (!oldData) return oldData;
						return oldData.map((group) =>
							group.id === payload.groupId
								? { ...group, averageBrightness: brightnessPercent }
								: group,
						);
					},
				);
			},
		);

		connection.on(
			"AutomationExecutionResult",
			(payload: AutomationExecutionResultPayload) => {
				Logger.info("Evento SignalR: AutomationExecutionResult", payload);

				// A execução grava um SystemEvent novo (lastExecutedAt, contagem por
				// dia da semana, histórico e badge de falha) — sem invalidar aqui,
				// esses dados só atualizariam no próximo staleTime (até 5min na
				// listagem), deixando a tela de Automações com "Última execução"
				// e o gráfico de barras defasados logo após a automação disparar.
				queryClient.invalidateQueries({ queryKey: automationsKeys.all });
				queryClient.invalidateQueries({
					queryKey: dashboardKeys.activityLogs(),
				});
				queryClient.invalidateQueries({
					queryKey: dashboardKeys.automationsSummary(),
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
			queryClient.invalidateQueries({
				queryKey: integrationsKeys.spotifyPlayback(),
			});
			queryClient.invalidateQueries({ queryKey: dashboardKeys.overview() });
			queryClient.invalidateQueries({ queryKey: dashboardKeys.activityLogs() });
			queryClient.invalidateQueries({ queryKey: automationsKeys.all });
			queryClient.invalidateQueries({
				queryKey: dashboardKeys.automationsSummary(),
			});
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

		// Exposta pra outros hooks (ex: useThrottledHubInvoke, usado pelo preview
		// de arraste de slider) reaproveitarem a MESMA conexão, sem abrir um
		// segundo WebSocket duplicado — este hook é o único dono do ciclo de
		// vida (start/stop), os demais só leem a referência pra invocar métodos.
		setActiveHubConnection(connection);

		return () => {
			clearTimeout(telemetryDebounceRef.current);
			setActiveHubConnection(null);
			connection.stop().catch((error: unknown) => {
				Logger.warn("Erro ao encerrar conexão SignalR de forma limpa", error);
			});
		};
	}, [user, isLoading, queryClient]);
}
