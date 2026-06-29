import { onAuthStateChanged } from "firebase/auth";
import { useEffect } from "react";
import { Router } from "@/app/Router";
import { auth } from "@/core/lib/firebase";
import { useAuthStore } from "@/features/auth/store/useAuthStore";

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
