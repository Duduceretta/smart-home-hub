import { onAuthStateChanged } from "firebase/auth";
import { useEffect } from "react";
import { auth } from "@/core/lib/firebase";
import { useAuthStore } from "../store/useAuthStore";

export function useAuthListener() {
	const setUser = useAuthStore((state) => state.setUser);
	const setLoading = useAuthStore((state) => state.setLoading);

	useEffect(() => {
		const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
			if (firebaseUser) {
				setUser(firebaseUser);
			} else {
				setUser(null);
			}

			setLoading(false);
		});

		return () => unsubscribe();
	}, [setUser, setLoading]);
}
