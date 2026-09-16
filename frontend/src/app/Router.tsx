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
import { AppLayout } from "@/widgets/layout/AppLayout";
import { AuthLayout } from "@/widgets/layout/AuthLayout";
import { AuthRoutePendingFallback } from "./AuthRoutePendingFallback";
import { RoutePendingFallback } from "./RoutePendingFallback";

// Cada página vira seu próprio chunk — sem isso, /login baixava o mesmo
// bundle de 1.6MB de /dashboard (recharts, SignalR, todas as features),
// mesmo sem precisar de nenhum deles antes do usuário autenticar.
//
// AuthLayout (o shell visual, não as páginas) fica de fora do lazy loading
// de propósito: ele não carrega nada do dashboard (isso já é resolvido pelas
// páginas abaixo serem separadas), e é praticamente garantido que qualquer
// visitante não autenticado vai precisar dele de imediato. Deixá-lo lazy só
// adicionava uma viagem de rede a mais e um Suspense fallback genérico
// (centralizado na viewport inteira) que não conhece o layout de 2 colunas
// do AuthLayout — no load a frio, o spinner aparecia centralizado na tela
// inteira e, ao resolver o chunk, o formulário "pulava" pra coluna direita
// (~29% da largura da viewport, mensurado). Com AuthLayout estático, o shell
// (e a posição onde o card vai cair) já existe desde o primeiro frame — o
// Suspense de cada página (abaixo) permanece, mas agora renderiza dentro do
// slot certo, sem salto.
const LoginPage = lazy(() => import("@/pages/login/LoginPage"));
const RegisterPage = lazy(() => import("@/pages/register/RegisterPage"));
const ForgotPasswordPage = lazy(
	() => import("@/pages/forgot-password/ForgotPasswordPage"),
);
const ResetPasswordPage = lazy(
	() => import("@/pages/reset-password/ResetPasswordPage"),
);
const VerifyEmailPage = lazy(
	() => import("@/pages/verify-email/VerifyEmailPage"),
);
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

// Só pras 5 páginas de auth, que renderizam dentro do outlet já centralizado
// do AuthLayout — ver AuthRoutePendingFallback.tsx pro porquê.
function withAuthFallback(element: React.ReactNode) {
	return <Suspense fallback={<AuthRoutePendingFallback />}>{element}</Suspense>;
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
						element: withAuthFallback(<LoginPage />),
					},
					{
						path: "/register",
						element: withAuthFallback(<RegisterPage />),
					},
					{
						path: "/forgot-password",
						element: withAuthFallback(<ForgotPasswordPage />),
					},
					{
						path: "/reset-password",
						element: withAuthFallback(<ResetPasswordPage />),
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
				element: withAuthFallback(<VerifyEmailPage />),
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
