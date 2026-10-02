import { useQuery } from "@tanstack/react-query";
import { fetchScenes } from "../api/scenes.api";
import type { Scene } from "../types/scenes.types";
import { scenesKeys } from "./scenes.keys";

/**
 * Busca e mantém em cache as cenas do usuário (stale time de 5 minutos).
 */
export function useScenes() {
	return useQuery<Scene[], Error>({
		queryKey: scenesKeys.lists(),
		queryFn: ({ signal }) => fetchScenes(undefined, undefined, signal),
		staleTime: 1000 * 60 * 5,
		retry: 1,
	});
}
