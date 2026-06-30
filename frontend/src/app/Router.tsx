import {
	createBrowserRouter,
	Navigate,
	RouterProvider,
} from "react-router-dom";
import { LogoutButton } from "@/features/auth/components/LogoutButton";
import { ProtectedRoute } from "@/features/auth/components/ProtectedRoute";
import { PublicRoute } from "@/features/auth/components/PublicRoute";
import { LoginPage } from "@/pages/LoginPage";
import { RecoveryPage } from "@/pages/RecoveryPage";
import { RegisterPage } from "@/pages/RegisterPage";
import { ResetPasswordPage } from "@/pages/ResetPasswordPage";

const DashboardPage = () => (
	<div className="flex h-screen flex-col items-center justify-center gap-6 bg-zinc-950 text-zinc-50">
		<div className="text-center">
			<h1 className="text-3xl font-bold text-indigo-400">Smart Home Hub 🏠</h1>
			<p className="mt-2 text-zinc-400">
				Você está logado e protegido pelo Route Guard.
			</p>
		</div>

		<LogoutButton />
	</div>
);

const router = createBrowserRouter([
	{
		element: <PublicRoute />,
		children: [
			{
				path: "/login",
				element: <LoginPage />,
			},
			{
				path: "/register",
				element: <RegisterPage />,
			},
			{ path: "/forgot-password", element: <RecoveryPage /> },
			{
				path: "/reset-password",
				element: <ResetPasswordPage />,
			},
		],
	},
	{
		element: <ProtectedRoute />,
		children: [
			{
				path: "/dashboard",
				element: <DashboardPage />,
			},
			// { path: "/dashboard/devices", element: <DevicesPage /> },
			// { path: "/dashboard/settings", element: <SettingsPage /> },
		],
	},
	{
		path: "/",
		element: <Navigate to="/dashboard" replace />,
	},
]);

export function Router() {
	return <RouterProvider router={router} />;
}
