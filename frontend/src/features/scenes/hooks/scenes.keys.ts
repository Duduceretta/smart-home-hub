import { SCENES_QUERY_ROOT } from "@/core/constants/query-key-roots";
import type { FetchScenesParams } from "../api/scenes.api";

/**
 * Factory for deterministic TanStack Query cache keys.
 * `all` shares its root with `core/constants/query-key-roots.ts` so a feature
 * that changes data a scene depends on (ex: deleting a device removes its scene
 * items on the API) can invalidate scenes without importing this feature.
 */
export const scenesKeys = {
	all: SCENES_QUERY_ROOT,
	lists: () => [...scenesKeys.all, "list"] as const,
	// Tudo que é leitura de cena mora sob `lists()`: criar, apagar e ativar invalidam
	// esse prefixo e levam junto páginas, ambientes e cena avulsa.
	page: (params: FetchScenesParams) =>
		[...scenesKeys.lists(), "page", params] as const,
	rooms: () => [...scenesKeys.lists(), "rooms"] as const,
	stats: (timeZone: string) =>
		[...scenesKeys.lists(), "stats", timeZone] as const,
	detail: (id: string) => [...scenesKeys.lists(), "detail", id] as const,
	devices: () => [...scenesKeys.all, "devices"] as const,
};
