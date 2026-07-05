import { onAuthStateChanged } from "firebase/auth";
import { useEffect } from "react";
import { auth } from "@/core/lib/firebase";
import { Logger } from "@/core/logger/app.logger";
import { useAuthStore } from "../store/useAuthStore";
import { useSyncUser } from "./useSyncUser";

export function useAuthListener() {
	const setUser = useAuthStore((state) => state.setUser);
	const setLoading = useAuthStore((state) => state.setLoading);

	const { mutateAsync: syncUserAsync } = useSyncUser();

	useEffect(() => {
		const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
			if (firebaseUser) {
				setUser(firebaseUser);

				try {
					await syncUserAsync();
				} catch (error) {
					Logger.error(
						"Falha ao sincronizar usuário com o banco SQL local",
						error,
					);
				} finally {
					setLoading(false);
				}
			} else {
				setUser(null);
				setLoading(false);
			}
		});

		return () => unsubscribe();
	}, [setUser, setLoading, syncUserAsync]);
}
