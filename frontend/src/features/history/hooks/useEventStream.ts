import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { createSignalRConnection } from "@/core/lib/signalr";
import { Logger } from "@/core/logger/app.logger";
import type { PagedResponse } from "@/core/types/pagination.types";
import { useAuthStore } from "@/features/auth/store/useAuthStore";
import { getEventHistory } from "../api/history.api";
import { useHistoryUIStore } from "../store/history-ui.store";
import type { GetHistoryParams, HistoryEvent } from "../types/history.types";
import { historyKeys } from "./history.keys";

const DEBOUNCE_MS = 800;

export function isAtScrollTop(element?: HTMLElement | null): boolean {
	if (typeof window === "undefined") return true;
	const windowTop = window.scrollY <= 10;
	if (!element) return windowTop;
	const scrollParent = element.closest(
		".overflow-y-auto",
	) as HTMLElement | null;
	const containerTop = scrollParent ? scrollParent.scrollTop <= 10 : true;
	return windowTop && containerTop;
}

export function scrollToTop(element?: HTMLElement | null): void {
	if (typeof window !== "undefined") {
		window.scrollTo({ top: 0, behavior: "smooth" });
	}
	const scrollParent = element?.closest(
		".overflow-y-auto",
	) as HTMLElement | null;
	if (scrollParent) {
		scrollParent.scrollTo({ top: 0, behavior: "smooth" });
	}
}

/**
 * Hook that listens to SignalR hub events (DeviceStatusChanged, DeviceMediaChanged,
 * SpotifyPlaybackChanged, AutomationExecutionResult) and debounces real-time background
 * fetching of newly persisted SystemEvents without manufacturing synthetic objects.
 */
export function useEventStream(
	queryParams: GetHistoryParams,
	containerRef?: React.RefObject<HTMLElement | null>,
): void {
	const user = useAuthStore((s) => s.user);
	const isLoading = useAuthStore((s) => s.isLoading);
	const queryClient = useQueryClient();
	const setPendingEvents = useHistoryUIStore((s) => s.setPendingEvents);
	const clearPendingEvents = useHistoryUIStore((s) => s.clearPendingEvents);

	const debounceTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
	const queryParamsRef = useRef(queryParams);
	queryParamsRef.current = queryParams;

	useEffect(() => {
		if (isLoading || !user) return;

		const connection = createSignalRConnection();

		const handleSignalRTrigger = (eventName: string, payload?: unknown) => {
			Logger.info(
				`[History] Sinal em tempo real recebido via SignalR: ${eventName}`,
				payload,
			);

			// Cancela busca pendente anterior para coalescer rajadas num único fetch
			if (debounceTimerRef.current) {
				clearTimeout(debounceTimerRef.current);
			}

			debounceTimerRef.current = setTimeout(async () => {
				try {
					const activeParams = queryParamsRef.current;
					const liveEndDateUtc = new Date(
						Date.now() + 24 * 60 * 60 * 1000,
					).toISOString();
					const fetchParams: GetHistoryParams = {
						...activeParams,
						endDateUtc:
							activeParams.endDateUtc && activeParams.endDateUtc > liveEndDateUtc
								? activeParams.endDateUtc
								: liveEndDateUtc,
						page: 1,
						pageSize: 20,
					};

					// Busca os eventos reais em segundo plano via API (sem invalidar a query imediatamente)
					const result = await getEventHistory(fetchParams);

					if (!result || !result.items) return;

					// Compara com os IDs existentes no cache atual para identificar os novos
					const currentCache = queryClient.getQueryData<
						PagedResponse<HistoryEvent>
					>(historyKeys.list(activeParams));
					const currentIds = new Set(
						currentCache?.items.map((item) => item.id) ?? [],
					);

					const genuinelyNewItems = result.items.filter(
						(item) => !currentIds.has(item.id),
					);

					if (genuinelyNewItems.length === 0) return;

					// Regra de auto-inserção segura:
					// Se o usuário está no topo da página E não tem cards expandidos, insere automaticamente
					const atTop = isAtScrollTop(containerRef?.current);
					const hasNoExpanded =
						useHistoryUIStore.getState().expandedEventIds.length === 0;

					if (atTop && hasNoExpanded) {
						queryClient.setQueryData<PagedResponse<HistoryEvent>>(
							historyKeys.list(activeParams),
							(oldData) => {
								if (!oldData) return result;
								const existingIds = new Set(
									oldData.items.map((event) => event.id),
								);
								const uniqueNew = genuinelyNewItems.filter(
									(item) => !existingIds.has(item.id),
								);
								return {
									...oldData,
									items: [...uniqueNew, ...oldData.items],
									totalCount: oldData.totalCount + uniqueNew.length,
								};
							},
						);
						clearPendingEvents();
					} else {
						// Caso contrário, acumula no buffer de pendências para o NewEventsPill
						setPendingEvents(genuinelyNewItems);
					}
				} catch (error: unknown) {
					Logger.warn(
						"[History] Falha ao sincronizar novos eventos em segundo plano:",
						error,
					);
				}
			}, DEBOUNCE_MS);
		};

		// Registra listeners para os 4 sinais de mutação do hub
		connection.on("DeviceStatusChanged", (p) =>
			handleSignalRTrigger("DeviceStatusChanged", p),
		);
		connection.on("DeviceMediaChanged", (p) =>
			handleSignalRTrigger("DeviceMediaChanged", p),
		);
		connection.on("SpotifyPlaybackChanged", (p) =>
			handleSignalRTrigger("SpotifyPlaybackChanged", p),
		);
		connection.on("AutomationExecutionResult", (p) =>
			handleSignalRTrigger("AutomationExecutionResult", p),
		);

		connection.onreconnecting((error) => {
			Logger.warn(
				"[History] Conexão SignalR caiu, tentando reconectar...",
				error,
			);
		});

		connection.onreconnected(() => {
			Logger.info("[History] Conexão SignalR restabelecida.");
			handleSignalRTrigger("Reconnected");
		});

		connection.onclose((error) => {
			Logger.error("[History] Conexão SignalR encerrada", error);
		});

		connection
			.start()
			.then(() => {
				Logger.info(
					"[History] Conexão SignalR para fluxo de eventos iniciada.",
				);
			})
			.catch((error: unknown) => {
				Logger.error(
					"[History] Falha ao conectar ao hub SignalR de eventos",
					error,
				);
			});

		return () => {
			if (debounceTimerRef.current) {
				clearTimeout(debounceTimerRef.current);
			}
			connection.stop().catch((error: unknown) => {
				Logger.warn(
					"[History] Erro ao encerrar conexão SignalR de eventos",
					error,
				);
			});
		};
	}, [
		user,
		isLoading,
		queryClient,
		setPendingEvents,
		clearPendingEvents,
		containerRef,
	]);
}
