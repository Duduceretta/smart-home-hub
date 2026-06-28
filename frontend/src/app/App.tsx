import { onAuthStateChanged } from "firebase/auth";
import { useEffect } from "react";
import { useAuthStore } from "@/features/auth/store/useAuthStore";
import { auth } from "@/core/lib/firebase";
import { Router } from "@/app/Router";

export function App() {
	const { setUser, setLoading } = useAuthStore();

	useEffect(() => {
		const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
			setUser(currentUser);
			setLoading(false);
		});

		return () => unsubscribe();
	}, [setUser, setLoading]);

	return <Router />;
}
