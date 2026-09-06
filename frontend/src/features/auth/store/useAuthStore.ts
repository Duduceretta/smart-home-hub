/**
 * Re-exported from `core/` (session state is a cross-feature concern read
 * outside `auth` — see `core/hooks/useAuthStore.ts`) so nothing inside this
 * feature had to change import paths. `auth` still owns every write to it.
 */
export { useAuthStore } from "@/core/hooks/useAuthStore";
