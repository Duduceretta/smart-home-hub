import {
	createBrowserRouter,
	Navigate,
	RouterProvider,
} from "react-router-dom";
import { ProtectedRoute } from "@/features/auth/guards/ProtectedRoute";
import { PublicRoute } from "@/features/auth/guards/PublicRoute";
import { DashboardPage } from "@/pages/dashboard/DashboardPage";
import { ForgotPasswordPage } from "@/pages/forgot-password/ForgotPasswordPage";
import { LoginPage } from "@/pages/login/LoginPage";
import { RegisterPage } from "@/pages/register/RegisterPage";
import { ResetPasswordPage } from "@/pages/reset-password/ResetPasswordPage";
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
			{ path: "/forgot-password", element: <ForgotPasswordPage /> },
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
