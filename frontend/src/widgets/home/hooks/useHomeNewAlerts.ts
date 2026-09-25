import { useEffect, useRef, useState } from "react";
import type { ActivityLogEntry } from "@/features/dashboard/types/dashboard.types";

/**
 * Deriva "novos alertas" a partir do feed de atividade já buscado pelo
 * `useActivityLog` da Home (nenhuma conexão SignalR própria — a invalidação
 * de `dashboardKeys.activityLogs()` já acontece no hook único
 * `useRealtimeListener`, o que basta pra refetch aqui).
 *
 * Sem base-line no primeiro carregamento, todo o histórico já existente
 * (ex: os 233 eventos acumulados) apareceria como "novo" — por isso os IDs
 * da primeira leitura são só registrados como já vistos, nunca exibidos.
 */
export function useHomeNewAlerts(entries: ActivityLogEntry[] | undefined) {
	const [newAlerts, setNewAlerts] = useState<ActivityLogEntry[]>([]);
	const seenIdsRef = useRef<Set<string> | null>(null);

	useEffect(() => {
		if (!entries) return;

		if (seenIdsRef.current === null) {
			seenIdsRef.current = new Set(entries.map((entry) => entry.id));
			return;
		}

		const seenIds = seenIdsRef.current;
		const freshAlerts = entries.filter(
			(entry) => entry.isAlert && !seenIds.has(entry.id),
		);

		if (freshAlerts.length === 0) return;

		for (const entry of entries) {
			seenIds.add(entry.id);
		}
		setNewAlerts((current) => [...freshAlerts, ...current]);
	}, [entries]);

	const dismiss = () => setNewAlerts([]);

	return { newAlerts, count: newAlerts.length, dismiss };
}
