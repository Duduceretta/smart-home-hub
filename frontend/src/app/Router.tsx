import { lazy, Suspense } from "react";
import {
	createBrowserRouter,
	Navigate,
	RouterProvider,
} from "react-router-dom";
import { ProtectedRoute } from "@/features/auth/guards/ProtectedRoute";
import { PublicRoute } from "@/features/auth/guards/PublicRoute";
import { DashboardPage } from "@/pages/dashboard/DashboardPage";
import DeviceGroupsPage from "@/pages/device-groups/DeviceGroupsPage";
import { DevicesPage } from "@/pages/devices/DevicesPage";
import { ForgotPasswordPage } from "@/pages/forgot-password/ForgotPasswordPage";
import { LoginPage } from "@/pages/login/LoginPage";
import { RegisterPage } from "@/pages/register/RegisterPage";
import { ResetPasswordPage } from "@/pages/reset-password/ResetPasswordPage";
import RoomsPage from "@/pages/rooms/RoomsPage";
import { SettingsPage } from "@/pages/settings/SettingsPage";
import { AppLayout } from "@/widgets/layout/AppLayout";

const DevToolsPage = import.meta.env.DEV
	? lazy(() => import("@/pages/dev/DevToolsPage"))
	: null;

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
				element: <AppLayout />,
				children: [
					{
						path: "/dashboard",
						element: <DashboardPage />,
					},
					{
						path: "/devices",
						element: <DevicesPage />,
					},
					{
						path: "/rooms",
						element: <RoomsPage />,
					},
					{
						path: "/device-groups",
						element: <DeviceGroupsPage />,
					},
					{
						path: "/settings",
						element: <SettingsPage />,
					},
					...(import.meta.env.DEV && DevToolsPage
						? [
								{
									path: "/dev-tools",
									element: (
										<Suspense fallback={null}>
											<DevToolsPage />
										</Suspense>
									),
								},
							]
						: []),
				],
			},
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
