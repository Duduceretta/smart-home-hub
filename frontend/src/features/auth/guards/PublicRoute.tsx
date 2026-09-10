import { Loader2 } from "lucide-react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";

export function PublicRoute() {
	const user = useAuthStore((state) => state.user);
	const isLoading = useAuthStore((state) => state.isLoading);
	const location = useLocation();

	if (isLoading) {
		return (
			<div className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-background">
				<Loader2 className="h-8 w-8 animate-spin text-primary" />
			</div>
		);
	}

	if (user) {
		const fromState = (
			location.state as {
				from?: { pathname: string; search?: string; hash?: string } | string;
			}
		)?.from;
		const destination =
			typeof fromState === "string"
				? fromState
				: fromState?.pathname
					? `${fromState.pathname}${fromState.search || ""}${fromState.hash || ""}`
					: "/dashboard";

		return <Navigate to={destination} replace />;
	}

	return <Outlet />;
}
