import type { User } from "firebase/auth";
import { create } from "zustand";

interface AuthState {
	user: User | null;
	isLoading: boolean;
	setUser: (user: User | null) => void;
	setLoading: (isLoading: boolean) => void;
}

/**
 * Session state (Firebase user + auth-loading flag) lives in `core/` because
 * it's a cross-feature concern read outside `features/auth` (SignalR hooks
 * in `devices`/`history` need to know if there's a logged-in user before
 * opening a connection). `features/auth/store/useAuthStore.ts` re-exports
 * this same binding — it still owns every write to it (login/logout,
 * `AuthStateListener`) — so nothing inside that feature had to change.
 * Read-only cross-feature consumers should prefer `core/hooks/useCurrentUser.ts`
 * instead of selecting off this store directly.
 */
export const useAuthStore = create<AuthState>((set) => ({
	user: null,
	isLoading: true,
	setUser: (user) => set({ user }),
	setLoading: (isLoading) => set({ isLoading }),
}));
