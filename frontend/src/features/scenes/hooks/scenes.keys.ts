import { SCENES_QUERY_ROOT } from "@/core/constants/query-key-roots";

/**
 * Factory for deterministic TanStack Query cache keys.
 * `all` shares its root with `core/constants/query-key-roots.ts` so a feature
 * that changes data a scene depends on (ex: deleting a device removes its scene
 * items on the API) can invalidate scenes without importing this feature.
 */
export const scenesKeys = {
	all: SCENES_QUERY_ROOT,
	lists: () => [...scenesKeys.all, "list"] as const,
	devices: () => [...scenesKeys.all, "devices"] as const,
};
