import {
	Bot,
	History,
	Home,
	LayoutDashboard,
	Plus,
	Router,
	Settings,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";

export function Sidebar() {
	const location = useLocation();
	const isActive = (path: string) => location.pathname.includes(path);

	const navItems = [
		{ name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
		{ name: "Dispositivos", path: "/devices", icon: Router },
		{ name: "Automações", path: "/automations", icon: Bot },
		{ name: "Histórico", path: "/history", icon: History },
	];

	return (
		<aside className="hidden md:flex flex-col w-64 h-full bg-zinc-950 border-r border-zinc-800/80 p-6 shrink-0 relative z-40">
			{/* Logo */}
			<div className="flex items-center gap-3 mb-8">
				<div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
					<Home className="text-indigo-400 w-5 h-5" />
				</div>
				<div className="flex flex-col">
					<span className="text-lg font-semibold tracking-tight text-zinc-50">
						Smart Hub
					</span>
					<span className="text-xs text-zinc-400">Hub Ativo: 01</span>
				</div>
			</div>

			{/* Navegação */}
			<nav className="flex-1 flex flex-col gap-2">
				{navItems.map((item) => (
					<Link
						key={item.name}
						to={item.path}
						className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
							isActive(item.path)
								? "bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 shadow-[0_0_15px_rgba(79,70,229,0.1)]"
								: "text-zinc-400 hover:text-zinc-50 hover:bg-zinc-900/50"
						}`}
					>
						<item.icon className="w-5 h-5" />
						{item.name}
					</Link>
				))}

				<Link
					to="/settings"
					className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-zinc-400 hover:text-zinc-50 hover:bg-zinc-900/50 transition-all duration-200 mt-auto"
				>
					<Settings className="w-5 h-5" />
					Configurações
				</Link>
			</nav>

			<div className="mt-6">
				{/* 👇 Adicione o type="button" aqui */}
				<button
					type="button"
					className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 font-medium text-sm transition-colors hover:bg-zinc-800 hover:text-zinc-50 group"
				>
					<Plus className="w-4 h-4 group-hover:text-indigo-400 transition-colors" />
					Adicionar
				</button>
			</div>
		</aside>
	);
}
