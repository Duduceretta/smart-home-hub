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
 * Accurately diffs incoming events against Page 1 cache regardless of the user's active page.
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

	const latestKnownTopEventIdRef = useRef<string | null>(null);

	// Registra o ID do evento mais recente conhecido no cache da página 1
	useEffect(() => {
		const page1Cache = queryClient.getQueryData<PagedResponse<HistoryEvent>>(
			historyKeys.list({ ...queryParams, page: 1 }),
		);
		if (page1Cache?.items[0]?.id && !latestKnownTopEventIdRef.current) {
			latestKnownTopEventIdRef.current = page1Cache.items[0].id;
		}
	}, [queryParams, queryClient]);

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

					// Busca sempre a página 1 em background para detectar as novidades reais
					const page1Params: GetHistoryParams = {
						...activeParams,
						page: 1,
						pageSize: activeParams.pageSize || 20,
					};

					const result = await getEventHistory(page1Params);

					if (!result?.items) return;

					// Compara SEMPRE contra o cache da Página 1 (evita falso positivo quando em página > 1)
					const page1Cache = queryClient.getQueryData<
						PagedResponse<HistoryEvent>
					>(historyKeys.list(page1Params));

					let genuinelyNewItems: HistoryEvent[] = [];

					if (page1Cache && page1Cache.items.length > 0) {
						const page1Ids = new Set(page1Cache.items.map((item) => item.id));
						genuinelyNewItems = result.items.filter(
							(item) => !page1Ids.has(item.id),
						);
					} else {
						// Se não havia cache de página 1 prévio (ex: entrou direto na página 6)
						if (latestKnownTopEventIdRef.current) {
							const topIndex = result.items.findIndex(
								(item) => item.id === latestKnownTopEventIdRef.current,
							);
							genuinelyNewItems =
								topIndex > 0 ? result.items.slice(0, topIndex) : [];
						} else {
							// Primeira leitura inicial: sincroniza a referência sem disparar falso alarme
							genuinelyNewItems = [];
						}
					}

					// Atualiza referência do item mais recente do topo
					if (result.items[0]?.id) {
						latestKnownTopEventIdRef.current = result.items[0].id;
					}

					if (genuinelyNewItems.length === 0) return;

					// Atualiza os cartões de estatísticas/KPIs em background
					queryClient.invalidateQueries({
						queryKey: historyKeys.stats(),
					});

					// Regra de auto-inserção segura:
					// SÓ insere automaticamente se o usuário estiver na PÁGINA 1 (activeParams.page === 1),
					// no topo do scroll e sem cards expandidos.
					const isPage1 = (activeParams.page ?? 1) === 1;
					const atTop = isAtScrollTop(containerRef?.current);
					const hasNoExpanded =
						useHistoryUIStore.getState().expandedEventIds.length === 0;

					if (isPage1 && atTop && hasNoExpanded) {
						queryClient.setQueryData<PagedResponse<HistoryEvent>>(
							historyKeys.list(page1Params),
							(oldData) => {
								if (!oldData) return result;
								const existingIds = new Set(
									oldData.items.map((event) => event.id),
								);
								const uniqueNew = genuinelyNewItems.filter(
									(item) => !existingIds.has(item.id),
								);
								const newTotal = oldData.totalCount + uniqueNew.length;
								const pageSize =
									oldData.pageSize || activeParams.pageSize || 20;

								return {
									...oldData,
									items: [...uniqueNew, ...oldData.items],
									totalCount: newTotal,
									totalPages: Math.ceil(newTotal / pageSize) || 1,
								};
							},
						);
						clearPendingEvents();
					} else {
						// Se estiver em página > 1, com scroll para baixo ou com cards expandidos:
						// Atualiza o cache da página 1 em background e acumula as pendências no NewEventsPill
						queryClient.setQueryData<PagedResponse<HistoryEvent>>(
							historyKeys.list(page1Params),
							result,
						);
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
