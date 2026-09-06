import { useAuthStore } from "@/core/hooks/useAuthStore";

/**
 * Read-only facade over the session store for features that only need to
 * know who's logged in (e.g. gating a SignalR connection) — never import
 * `useAuthStore` directly from another feature for this; the session is a
 * global concern, not `auth`-internal. `features/auth` itself still writes
 * to `useAuthStore` directly (login/logout, `AuthStateListener`) since
 * that's its own domain, not a cross-feature read.
 */
export function useCurrentUser() {
	const user = useAuthStore((s) => s.user);
	const isLoading = useAuthStore((s) => s.isLoading);
	return { user, isLoading };
}
