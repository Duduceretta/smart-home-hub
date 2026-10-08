import { useQuery } from "@tanstack/react-query";
import { fetchSceneRooms } from "../api/scenes.api";
import { scenesKeys } from "./scenes.keys";

/**
 * Ambientes que aparecem em alguma cena (opções do filtro da lista), independente
 * da página e dos filtros ativos.
 */
export function useSceneRooms() {
	return useQuery<string[], Error>({
		queryKey: scenesKeys.rooms(),
		queryFn: ({ signal }) => fetchSceneRooms(signal),
		staleTime: 1000 * 60 * 5,
		retry: 1,
	});
}
