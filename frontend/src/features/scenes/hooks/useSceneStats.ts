import { useQuery } from "@tanstack/react-query";
import { fetchSceneStats } from "../api/scenes.api";
import type { SceneMetrics } from "../types/scenes.types";
import { scenesKeys } from "./scenes.keys";

/**
 * Estatísticas das ativações de cena (painel de desempenho). Usa o fuso do navegador, que é
 * o que o usuário vê no relógio, para a virada do dia e o horário de pico baterem com a tela.
 * Ativar uma cena invalida esta consulta junto com a lista (`scenesKeys.lists()`).
 */
export function useSceneStats() {
	const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

	return useQuery<SceneMetrics, Error>({
		queryKey: scenesKeys.stats(timeZone),
		queryFn: ({ signal }) => fetchSceneStats(timeZone, signal),
		staleTime: 1000 * 60,
		retry: 1,
	});
}
