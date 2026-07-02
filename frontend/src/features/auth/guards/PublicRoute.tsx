import { Loader2 } from "lucide-react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";

export function PublicRoute() {
	const user = useAuthStore((state) => state.user);
	const isLoading = useAuthStore((state) => state.isLoading);

	if (isLoading) {
		return (
			<div className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-zinc-950">
				<Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
			</div>
		);
	}

	if (user) {
		return <Navigate to="/dashboard" replace />;
	}

	return <Outlet />;
}
