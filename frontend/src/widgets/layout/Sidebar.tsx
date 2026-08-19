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
import { Progress } from "@/core/components/ui/progress";
import { cn } from "@/core/utils";
import { useDevices } from "@/features/devices/hooks/useDevices";

export function Sidebar() {
	const [isCollapsed, setIsCollapsed] = useState(false);
	const location = useLocation();
	const { data: devices = [] } = useDevices();

	const isActive = (path: string) => location.pathname.includes(path);

	const navItems = [
		{ name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
		{ name: "Dispositivos", path: "/devices", icon: Router },
		{ name: "Ambientes", path: "/rooms", icon: DoorOpen },
		{ name: "Grupos", path: "/device-groups", icon: Layers },
		{ name: "Automações", path: "/automations", icon: Bot },
		{ name: "Histórico", path: "/history", icon: History },
	];

	const totalCount = devices.length;
	const onlineCount = devices.filter((d) => d.isOnline).length;
	const onlineRatio =
		totalCount > 0 ? Math.round((onlineCount / totalCount) * 100) : 0;

	return (
		<aside
			className={cn(
				// 👇 Fundo escuro fixado no tom surface-container-low (#1c1b1c)
				"hidden md:flex flex-col h-full border-r border-border bg-gradient-to-b from-card/70 to-card/40 backdrop-blur-xl z-50 shrink-0 relative transition-[width] duration-300 ease-in-out text-foreground",
				isCollapsed ? "w-20 p-4" : "w-72 p-6",
			)}
		>
			{/* Botão para Colapsar/Expandir a Sidebar */}
			<button
				type="button"
				onClick={() => setIsCollapsed(!isCollapsed)}
				className="absolute -right-3 top-7 z-50 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-popover text-muted-foreground shadow-md transition-all hover:bg-card hover:text-foreground cursor-pointer"
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

			{/* Top Section: Logo & Navegação */}
			<div
				className={cn(
					"flex flex-col flex-1",
					isCollapsed ? "space-y-6" : "space-y-8",
				)}
			>
				{/* Logo & Marca */}
				<div
					className={cn(
						"flex items-center gap-3 transition-all duration-300 overflow-hidden",
						isCollapsed ? "justify-center px-0" : "px-1",
					)}
				>
					<div className="h-9 w-9 rounded-xl bg-accent border border-border flex items-center justify-center text-primary shadow-sm shrink-0">
						<Home className="w-5 h-5" />
					</div>
					{!isCollapsed && (
						<div className="flex flex-col min-w-0 transition-opacity duration-200">
							<span className="font-semibold text-lg tracking-tight text-foreground truncate">
								Smart Hub
							</span>
							<span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider truncate">
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
									"flex items-center gap-3 rounded-lg text-xs font-medium transition-all duration-200",
									isCollapsed
										? "justify-center p-2.5"
										: "justify-start px-3 py-2.5",
									active
										? "bg-card text-foreground ring-1 ring-border shadow-sm font-semibold"
										: "text-muted-foreground hover:text-foreground hover:bg-card/50",
								)}
							>
								<item.icon
									className={cn(
										"w-4 h-4 shrink-0 transition-colors",
										active ? "text-primary" : "text-muted-foreground",
									)}
								/>
								{!isCollapsed && (
									<span className="truncate transition-opacity duration-200">
										{item.name}
									</span>
								)}
							</Link>
						);
					})}

					{/* Botão Configurações */}
					<Link
						to="/settings"
						title={isCollapsed ? "Configurações" : undefined}
						className={cn(
							"flex items-center gap-3 rounded-lg text-xs font-medium transition-all duration-200 mt-auto",
							isCollapsed
								? "justify-center p-2.5"
								: "justify-start px-3 py-2.5",
							isActive("/settings")
								? "bg-card text-foreground ring-1 ring-border shadow-sm font-semibold"
								: "text-muted-foreground hover:text-foreground hover:bg-card/50",
						)}
					>
						<Settings className="w-4 h-4 shrink-0" />
						{!isCollapsed && <span className="truncate">Configurações</span>}
					</Link>
				</nav>
			</div>

			{/* Rodapé: Widget de Status & Ação Rápida */}
			<div className="space-y-3 pt-4 border-t border-border">
				{/* Status Real: Dispositivos Online */}
				{!isCollapsed && totalCount > 0 && (
					<div className="rounded-xl border border-border bg-card/60 p-4 space-y-3">
						<div className="flex items-center justify-between text-xs font-semibold tracking-wider uppercase text-muted-foreground">
							<span>Dispositivos Online</span>
							<span className="text-primary font-bold">
								{onlineCount}/{totalCount}
							</span>
						</div>
						<Progress value={onlineRatio} className="h-1.5 bg-background" />
					</div>
				)}

				{/* Ação Inferior (Adicionar) */}
				<button
					type="button"
					title={isCollapsed ? "Adicionar" : undefined}
					className={cn(
						"w-full flex items-center justify-center gap-2 rounded-lg bg-card/40 border border-border text-foreground font-medium text-xs transition-all hover:bg-card hover:border-primary/40 shadow-sm group cursor-pointer",
						isCollapsed ? "h-9 w-9 p-0 mx-auto" : "px-3 py-2.5",
					)}
				>
					<Plus className="w-4 h-4 text-primary group-hover:scale-110 transition-transform shrink-0" />
					{!isCollapsed && <span>Adicionar</span>}
				</button>
			</div>
		</aside>
	);
}
