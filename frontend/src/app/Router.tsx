import {
	createBrowserRouter,
	Navigate,
	RouterProvider,
} from "react-router-dom";
import { ProtectedRoute } from "@/features/auth/components/ProtectedRoute";
import { PublicRoute } from "@/features/auth/components/PublicRoute";
import { DashboardPage } from "@/pages/DashboardPage";
import { LoginPage } from "@/pages/LoginPage";
import { RecoveryPage } from "@/pages/RecoveryPage";
import { RegisterPage } from "@/pages/RegisterPage";
import { ResetPasswordPage } from "@/pages/ResetPasswordPage";
import { DashboardLayout } from "@/widgets/layout/DashboardLayout";

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
				element: <DashboardLayout />,
				children: [
					{
						path: "/dashboard",
						element: <DashboardPage />,
					},
					// Futuras páginas: { path: "/devices", element: <DevicesPage /> }
				],
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
