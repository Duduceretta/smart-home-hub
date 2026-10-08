import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { PagedResponse } from "@/core/types/pagination.types";
import { type FetchScenesParams, fetchScenes } from "../api/scenes.api";
import type { Scene } from "../types/scenes.types";
import { scenesKeys } from "./scenes.keys";

/**
 * Uma página das cenas do usuário, já filtrada no servidor (stale time de 5 minutos).
 * `placeholderData: keepPreviousData` mantém a página anterior na tela enquanto a
 * próxima carrega, em vez de piscar o esqueleto a cada troca de página ou de filtro.
 */
export function useScenes(params: FetchScenesParams) {
	return useQuery<PagedResponse<Scene>, Error>({
		queryKey: scenesKeys.page(params),
		queryFn: ({ signal }) => fetchScenes(params, signal),
		staleTime: 1000 * 60 * 5,
		retry: 1,
		placeholderData: keepPreviousData,
	});
}
