import { lazy, Suspense } from "react";
import {
	createBrowserRouter,
	Navigate,
	RouterProvider,
} from "react-router-dom";
import { setUnauthorizedRedirectHandler } from "@/core/api/api.client";
import { RouteErrorBoundary } from "@/core/components/feedback/PageErrorBoundary";
import { ProtectedRoute } from "@/features/auth/guards/ProtectedRoute";
import { PublicRoute } from "@/features/auth/guards/PublicRoute";
import { ForgotPasswordPage } from "@/pages/forgot-password/ForgotPasswordPage";
import { LoginPage } from "@/pages/login/LoginPage";
import { RegisterPage } from "@/pages/register/RegisterPage";
import { ResetPasswordPage } from "@/pages/reset-password/ResetPasswordPage";
import { VerifyEmailPage } from "@/pages/verify-email/VerifyEmailPage";
import { AppLayout } from "@/widgets/layout/AppLayout";
import { AuthLayout } from "@/widgets/layout/AuthLayout";
import { RoutePendingFallback } from "./RoutePendingFallback";

// AuthLayout (o shell visual) fica de fora do lazy loading de propósito: ele
// não carrega nada do dashboard, e é praticamente garantido que qualquer
// visitante não autenticado vai precisar dele de imediato.
//
// As 5 páginas de auth (login/register/forgot-password/reset-password/
// verify-email), importadas acima, também ficam de fora do lazy loading —
// cada uma é só um form fininho (react-hook-form + zod + firebase), sem
// nada do peso pesado do dashboard (recharts, SignalR), então dividir em
// chunk não economiza bytes que importam e só troca esse ganho por um
// Suspense boundary que precisa de fallback (skeleton ou spinner) e sempre
// acaba com uma troca perceptível quando o chunk resolve. Sem lazy aqui,
// essas páginas já existem prontas desde o primeiro frame — sem fallback,
// sem salto.
const PrivacyPage = lazy(() => import("@/pages/legal/privacy/PrivacyPage"));
const TermsPage = lazy(() => import("@/pages/legal/terms/TermsPage"));
const HomePage = lazy(() => import("@/pages/home/HomePage"));
const DashboardPage = lazy(() => import("@/pages/dashboard/DashboardPage"));
const DevicesPage = lazy(() => import("@/pages/devices/DevicesPage"));
const RoomsPage = lazy(() => import("@/pages/rooms/RoomsPage"));
const DeviceGroupsPage = lazy(
	() => import("@/pages/device-groups/DeviceGroupsPage"),
);
const AutomationsPage = lazy(
	() => import("@/pages/automations/AutomationsPage"),
);
const HistoryPage = lazy(() => import("@/pages/history/HistoryPage"));
const SettingsPage = lazy(() => import("@/pages/settings/SettingsPage"));

const DevToolsPage = import.meta.env.DEV
	? lazy(() => import("@/pages/dev/DevToolsPage"))
	: null;

function withFallback(element: React.ReactNode) {
	return <Suspense fallback={<RoutePendingFallback />}>{element}</Suspense>;
}

export const router = createBrowserRouter([
	{
		element: <PublicRoute />,
		errorElement: <RouteErrorBoundary />,
		children: [
			{
				element: <AuthLayout />,
				children: [
					{
						path: "/login",
						element: <LoginPage />,
					},
					{
						path: "/register",
						element: <RegisterPage />,
					},
					{
						path: "/forgot-password",
						element: <ForgotPasswordPage />,
					},
					{
						path: "/reset-password",
						element: <ResetPasswordPage />,
					},
				],
			},
		],
	},
	{
		element: <ProtectedRoute />,
		errorElement: <RouteErrorBoundary />,
		children: [
			{
				element: <AppLayout />,
				children: [
					{
						path: "/home",
						element: withFallback(<HomePage />),
					},
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
						path: "/automations",
						element: <AutomationsPage />,
					},
					{
						path: "/history",
						element: <HistoryPage />,
					},
					{
						path: "/settings",
						element: <SettingsPage />,
					},
					...(import.meta.env.DEV && DevToolsPage
						? [
								{
									path: "/dev-tools",
									element: <DevToolsPage />,
								},
							]
						: []),
				],
			},
		],
	},
	{
		element: <AuthLayout />,
		children: [
			{
				path: "/verify-email",
				element: <VerifyEmailPage />,
			},
		],
	},
	{
		path: "/legal/privacy",
		element: withFallback(<PrivacyPage />),
	},
	{
		path: "/legal/terms",
		element: withFallback(<TermsPage />),
	},
	{
		path: "/",
		element: <Navigate to="/home" replace />,
	},
]);

setUnauthorizedRedirectHandler((to) => {
	void router.navigate(to, { replace: true });
});

export function Router() {
	// `useTransitions={false}` — desliga o wrapping automático de updates de
	// estado do router em `React.startTransition` (comportamento padrão do
	// RRv7 desde que a antiga future flag `v7_startTransition` virou
	// default). Mitiga acúmulo sob navegação muito rápida — parte da causa
	// raiz do travamento ao trocar de rota rapidamente, junto com o `<Link>`
	// trocado por `navigate()` em botão nativo (ver Sidebar.tsx).
	return <RouterProvider router={router} useTransitions={false} />;
}
