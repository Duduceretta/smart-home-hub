/**
 * Root query-key segments shared across the FSD layer boundary. Two uses:
 *
 * 1. A cross-feature lookup hook in `core/` and the owning feature's own
 *    query key factory agree on the same root so TanStack Query treats
 *    their queries as the same cache entry (see `ROOMS_QUERY_ROOT` +
 *    `core/hooks/useRoomLookup.ts` — a room rename via `features/rooms`
 *    also invalidates the lookup without extra wiring).
 * 2. A mutation in one feature that must invalidate another feature's
 *    cache (e.g. toggling a device from `device-groups` needs `devices`'s
 *    list to refetch) imports the root here instead of importing that
 *    feature's `.keys.ts` directly — FSD forbids features importing each
 *    other, but every feature is free to import `core/`. This only ever
 *    invalidates by root (coarse: the whole feature's cache), never a
 *    specific nested key — reaching for a leaf key would mean either
 *    duplicating that feature's internal key shape as a magic string
 *    (fragile) or importing its `.keys.ts` (an FSD violation).
 */
export const ROOMS_QUERY_ROOT = ["rooms"] as const;
export const DASHBOARD_QUERY_ROOT = ["dashboard"] as const;
export const DEVICES_QUERY_ROOT = ["devices"] as const;
export const AUTOMATIONS_QUERY_ROOT = ["automations"] as const;
