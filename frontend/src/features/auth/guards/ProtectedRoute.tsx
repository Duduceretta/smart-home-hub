import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";

export function ProtectedRoute() {
	const { t } = useTranslation("auth");
	const user = useAuthStore((state) => state.user);
	const isLoading = useAuthStore((state) => state.isLoading);

	if (isLoading) {
		return (
			<div className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-background">
				<Loader2 className="h-8 w-8 animate-spin text-primary" />
				<p className="text-sm font-medium text-muted-foreground">
					{t("guards.checkingCredentials")}
				</p>
			</div>
		);
	}

	if (!user) {
		return <Navigate to="/login" replace />;
	}

	return <Outlet />;
}
