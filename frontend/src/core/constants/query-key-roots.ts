/**
 * Root query-key segments shared across the FSD layer boundary. A
 * cross-feature lookup hook in `core/` and the owning feature's own query
 * key factory must agree on the same root so TanStack Query treats their
 * queries as the same cache entry — a room rename via `features/rooms`
 * then also invalidates `core/hooks/useRoomLookup.ts` without extra wiring.
 */
export const ROOMS_QUERY_ROOT = ["rooms"] as const;
