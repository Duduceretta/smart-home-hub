import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";

export function PublicRoute() {
	const user = useAuthStore((state) => state.user);
	const isLoading = useAuthStore((state) => state.isLoading);
	const location = useLocation();

	// Ao contrário do ProtectedRoute, não há dado sensível a esconder aqui —
	// renderiza o Outlet (AuthLayout + página de auth) desde o primeiro frame
	// em vez de um spinner full-screen enquanto o Firebase resolve
	// `isLoading`. Isso evita o salto visual de um spinner centralizado pro
	// layout de 2 colunas assim que a sessão é confirmada. Só decide
	// redirecionar (usuário já logado acessando /login por engano) depois
	// que isLoading vira false.
	if (!isLoading && user) {
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
