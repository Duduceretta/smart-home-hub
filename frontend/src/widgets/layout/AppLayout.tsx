import { Bot, LayoutDashboard, Router, Settings } from "lucide-react";
import { Link, Outlet } from "react-router-dom";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";

export function AppLayout() {
	return (
		<div className="flex w-full h-screen bg-zinc-950 text-zinc-50 overflow-hidden antialiased selection:bg-indigo-500/30">
			{/* Menu Lateral (Desktop) */}
			<Sidebar />

			{/* Área Principal */}
			<main className="flex-1 flex flex-col h-full min-w-0 relative">
				<Header />

				{/* Área de Conteúdo Rolável */}
				<div className="flex-1 overflow-y-auto w-full p-4 md:p-8">
					<div className="max-w-7xl mx-auto pb-20 md:pb-0">
						<Outlet />
					</div>
				</div>
			</main>

			{/* Menu Inferior (Mobile) */}
			<nav className="md:hidden fixed bottom-0 w-full h-16 bg-zinc-950/90 backdrop-blur-xl border-t border-zinc-800/80 flex justify-around items-center px-2 z-50">
				<Link
					to="/dashboard"
					className="flex flex-col items-center justify-center w-16 text-indigo-400"
				>
					<LayoutDashboard className="w-5 h-5 mb-1" />
					<span className="text-[10px] font-medium">Início</span>
				</Link>
				<Link
					to="/devices"
					className="flex flex-col items-center justify-center w-16 text-zinc-400 hover:text-zinc-50"
				>
					<Router className="w-5 h-5 mb-1" />
					<span className="text-[10px] font-medium">Equip.</span>
				</Link>
				<Link
					to="/automations"
					className="flex flex-col items-center justify-center w-16 text-zinc-400 hover:text-zinc-50"
				>
					<Bot className="w-5 h-5 mb-1" />
					<span className="text-[10px] font-medium">Rotinas</span>
				</Link>
				<Link
					to="/settings"
					className="flex flex-col items-center justify-center w-16 text-zinc-400 hover:text-zinc-50"
				>
					<Settings className="w-5 h-5 mb-1" />
					<span className="text-[10px] font-medium">Ajustes</span>
				</Link>
			</nav>
		</div>
	);
}
