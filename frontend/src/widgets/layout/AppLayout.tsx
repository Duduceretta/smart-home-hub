import { Bot, LayoutDashboard, Router, Settings } from "lucide-react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { cn } from "@/core/utils";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";

export function AppLayout() {
	const location = useLocation();
	const isActive = (path: string) => location.pathname.includes(path);
	const isRoomsRoute = location.pathname.startsWith("/rooms");

	const mobileNavItems = [
		{ name: "Início", path: "/dashboard", icon: LayoutDashboard },
		{ name: "Equip.", path: "/devices", icon: Router },
		{ name: "Rotinas", path: "/automations", icon: Bot },
		{ name: "Ajustes", path: "/settings", icon: Settings },
	];

	return (
		// Container fixo na altura total da tela
		<div className="flex w-full h-screen overflow-hidden bg-background text-foreground antialiased selection:bg-primary/20">
			{/* Menu Lateral (Desktop) */}
			<Sidebar />

			{/* Área Principal */}
			<main className="flex-1 flex flex-col h-full min-w-0 relative bg-linear-to-b from-muted to-background">
				<Header />

				{/* Área de Conteúdo Rolável */}
				<div className="flex-1 overflow-y-auto w-full p-4 sm:p-6 lg:p-8 [scrollbar-gutter:stable] scrollbar-thin">
					<div
						key={location.pathname}
						className={cn(
							"w-full pb-20 md:pb-0 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200",
							// Automações, Ambientes, Dispositivos e Grupos precisam de altura
							// definida pra fazer o split-view rolar por dentro (lista e
							// painel de detalhe cada um com seu próprio scroll), não a
							// página inteira, como as outras rotas fazem. h-full só
							// nessas rotas — as demais mantêm a classe idêntica de antes.
							(location.pathname.startsWith("/automations") ||
								location.pathname.startsWith("/devices") ||
								location.pathname.startsWith("/device-groups") ||
								isRoomsRoute) &&
								"h-full",
						)}
					>
						<Outlet />
					</div>
				</div>
			</main>

			{/* Menu Inferior (Mobile) */}
			<nav className="md:hidden fixed bottom-0 w-full h-16 bg-card/85 backdrop-blur-xl border-t border-border flex justify-around items-center px-2 z-50 shadow-lg">
				{mobileNavItems.map((item) => {
					const active = isActive(item.path);
					return (
						<Link
							key={item.name}
							to={item.path}
							className={cn(
								"flex flex-col items-center justify-center w-16 py-1 rounded-lg transition-colors",
								active
									? "text-primary font-semibold"
									: "text-muted-foreground hover:text-foreground",
							)}
						>
							<item.icon
								className={cn(
									"w-5 h-5 mb-1 transition-transform",
									active && "scale-110",
								)}
							/>
							<span className="text-xs tracking-tight">{item.name}</span>
						</Link>
					);
				})}
			</nav>
		</div>
	);
}
