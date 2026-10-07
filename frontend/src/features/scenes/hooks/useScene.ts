import { useQuery } from "@tanstack/react-query";
import { fetchScene } from "../api/scenes.api";
import type { Scene } from "../types/scenes.types";
import { scenesKeys } from "./scenes.keys";

/**
 * Uma cena pelo id. Sem id, a query fica desligada: serve à cena selecionada que não
 * está na página atual e à tela de edição.
 */
export function useScene(id: string | null | undefined) {
	return useQuery<Scene, Error>({
		queryKey: scenesKeys.detail(id ?? ""),
		queryFn: ({ signal }) => fetchScene(id as string, signal),
		enabled: Boolean(id),
		staleTime: 1000 * 60 * 5,
		retry: false,
	});
}
