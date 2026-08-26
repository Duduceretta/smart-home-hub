import { lazy, Suspense } from "react";
import {
	createBrowserRouter,
	Navigate,
	RouterProvider,
} from "react-router-dom";
import { ProtectedRoute } from "@/features/auth/guards/ProtectedRoute";
import { PublicRoute } from "@/features/auth/guards/PublicRoute";
import { AppLayout } from "@/widgets/layout/AppLayout";
import { RoutePendingFallback } from "./RoutePendingFallback";

// Cada página vira seu próprio chunk — sem isso, /login baixava o mesmo
// bundle de 1.6MB de /dashboard (recharts, SignalR, todas as features),
// mesmo sem precisar de nenhum deles antes do usuário autenticar.
const LoginPage = lazy(() => import("@/pages/login/LoginPage"));
const RegisterPage = lazy(() => import("@/pages/register/RegisterPage"));
const ForgotPasswordPage = lazy(
	() => import("@/pages/forgot-password/ForgotPasswordPage"),
);
const ResetPasswordPage = lazy(
	() => import("@/pages/reset-password/ResetPasswordPage"),
);
const DashboardPage = lazy(() => import("@/pages/dashboard/DashboardPage"));
const DevicesPage = lazy(() => import("@/pages/devices/DevicesPage"));
const RoomsPage = lazy(() => import("@/pages/rooms/RoomsPage"));
const DeviceGroupsPage = lazy(
	() => import("@/pages/device-groups/DeviceGroupsPage"),
);
const SettingsPage = lazy(() => import("@/pages/settings/SettingsPage"));

const DevToolsPage = import.meta.env.DEV
	? lazy(() => import("@/pages/dev/DevToolsPage"))
	: null;

function withFallback(element: React.ReactNode) {
	return <Suspense fallback={<RoutePendingFallback />}>{element}</Suspense>;
}

const router = createBrowserRouter([
	{
		element: <PublicRoute />,
		children: [
			{
				path: "/login",
				element: withFallback(<LoginPage />),
			},
			{
				path: "/register",
				element: withFallback(<RegisterPage />),
			},
			{
				path: "/forgot-password",
				element: withFallback(<ForgotPasswordPage />),
			},
			{
				path: "/reset-password",
				element: withFallback(<ResetPasswordPage />),
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
						element: withFallback(<DashboardPage />),
					},
					{
						path: "/devices",
						element: withFallback(<DevicesPage />),
					},
					{
						path: "/rooms",
						element: withFallback(<RoomsPage />),
					},
					{
						path: "/device-groups",
						element: withFallback(<DeviceGroupsPage />),
					},
					{
						path: "/settings",
						element: withFallback(<SettingsPage />),
					},
					...(import.meta.env.DEV && DevToolsPage
						? [
								{
									path: "/dev-tools",
									element: withFallback(<DevToolsPage />),
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
