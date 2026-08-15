import {
	Bot,
	ChevronLeft,
	DoorOpen,
	History,
	Home,
	Layers,
	LayoutDashboard,
	Plus,
	Router,
	Settings,
} from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/core/utils";

export function Sidebar() {
	const [isCollapsed, setIsCollapsed] = useState(false);
	const location = useLocation();

	const isActive = (path: string) => location.pathname.includes(path);

	const navItems = [
		{ name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
		{ name: "Dispositivos", path: "/devices", icon: Router },
		{ name: "Ambientes", path: "/rooms", icon: DoorOpen },
		{ name: "Grupos", path: "/device-groups", icon: Layers },
		{ name: "Automações", path: "/automations", icon: Bot },
		{ name: "Histórico", path: "/history", icon: History },
	];

	return (
		<aside
			className={cn(
				"hidden md:flex flex-col h-full bg-zinc-950 border-r border-zinc-800/80 p-4 shrink-0 relative z-40 transition-[width] duration-300 ease-in-out",
				isCollapsed ? "w-20" : "w-64",
			)}
		>
			{/* Botão para Colapsar/Expandir a Sidebar */}
			<button
				type="button"
				onClick={() => setIsCollapsed(!isCollapsed)}
				className="absolute -right-3 top-7 z-50 flex h-6 w-6 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900 text-zinc-400 shadow-md transition-all hover:bg-zinc-800 hover:text-zinc-100 cursor-pointer"
				title={
					isCollapsed ? "Expandir barra lateral" : "Recolher barra lateral"
				}
			>
				<ChevronLeft
					className={cn(
						"h-3.5 w-3.5 transition-transform duration-300",
						isCollapsed && "rotate-180",
					)}
				/>
			</button>

			{/* Logo & Marca */}
			<div
				className={cn(
					"flex items-center gap-3 mb-6 transition-all duration-300 overflow-hidden",
					isCollapsed ? "justify-center px-0" : "px-2",
				)}
			>
				<div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
					<Home className="text-indigo-400 w-5 h-5" />
				</div>
				{!isCollapsed && (
					<div className="flex flex-col min-w-0 transition-opacity duration-200">
						<span className="text-sm font-bold tracking-tight text-zinc-50 truncate">
							Smart Hub
						</span>
						<span className="text-[11px] text-zinc-400 truncate">
							Hub Ativo: 01
						</span>
					</div>
				)}
			</div>

			{/* Navegação Principal */}
			<nav className="flex-1 flex flex-col gap-1.5 overflow-hidden">
				{navItems.map((item) => {
					const active = isActive(item.path);
					return (
						<Link
							key={item.name}
							to={item.path}
							title={isCollapsed ? item.name : undefined}
							className={cn(
								"flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all duration-200",
								isCollapsed ? "justify-center" : "justify-start",
								active
									? "bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 shadow-[0_0_15px_rgba(79,70,229,0.1)]"
									: "text-zinc-400 hover:text-zinc-50 hover:bg-zinc-900/50 border border-transparent",
							)}
						>
							<item.icon className="w-4 h-4 shrink-0" />
							{!isCollapsed && (
								<span className="truncate transition-opacity duration-200">
									{item.name}
								</span>
							)}
						</Link>
					);
				})}

				{/* Botão Configurações (Ancorado no final do menu) */}
				<Link
					to="/settings"
					title={isCollapsed ? "Configurações" : undefined}
					className={cn(
						"flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all duration-200 mt-auto",
						isCollapsed ? "justify-center" : "justify-start",
						isActive("/settings")
							? "bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 shadow-[0_0_15px_rgba(79,70,229,0.1)]"
							: "text-zinc-400 hover:text-zinc-50 hover:bg-zinc-900/50 border border-transparent",
					)}
				>
					<Settings className="w-4 h-4 shrink-0" />
					{!isCollapsed && <span className="truncate">Configurações</span>}
				</Link>
			</nav>

			{/* Ação Inferior (Adicionar) */}
			<div className="mt-4 pt-3 border-t border-zinc-800/60">
				<button
					type="button"
					title={isCollapsed ? "Adicionar" : undefined}
					className={cn(
						"w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 font-medium text-xs transition-colors hover:bg-zinc-800 hover:text-zinc-50 group cursor-pointer",
						isCollapsed && "px-0",
					)}
				>
					<Plus className="w-4 h-4 group-hover:text-indigo-400 transition-colors shrink-0" />
					{!isCollapsed && <span>Adicionar</span>}
				</button>
			</div>
		</aside>
	);
}
