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
	const { data } = useDevices({ pageSize: 200 });
	const devices = data?.items ?? [];

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
				// Sem backdrop-blur: como a sidebar nunca fica sobreposta a outro
				// conteúdo (é o primeiro item do flex, não um overlay), o blur não
				// mudava nada visualmente — só forçava o navegador a recalcular o
				// backdrop a cada frame do resize, sendo o principal custo de
				// performance da animação. A translucidez original (/70, /40)
				// continua aqui — sem o blur por trás pra suavizar ela é só alpha
				// blend direto contra o fundo, mas como o fundo é sólido (nada
				// dinâmico atrás da sidebar), o resultado visual fica bem próximo
				// do original mesmo sem o blur.
				"hidden md:flex flex-col h-full border-r border-border bg-linear-to-b from-card/70 to-card/40 z-50 shrink-0 relative transition-[width] duration-200 ease-out text-foreground will-change-[width]",
				isCollapsed ? "w-20 p-4" : "w-72 p-6",
			)}
		>
			{/* Botão para Colapsar/Expandir a Sidebar */}
			<button
				type="button"
				onClick={() => setIsCollapsed(!isCollapsed)}
				className="absolute -right-3 top-7 z-50 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-surface-highest text-muted-foreground shadow-md transition-all hover:bg-card hover:text-foreground cursor-pointer"
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
				<div className="flex items-center gap-4 overflow-hidden px-1">
					<div className="h-9 w-9 rounded-xl bg-accent border border-border flex items-center justify-center text-primary shadow-sm shrink-0">
						<Home className="w-5 h-5" />
					</div>
					{/* Sempre montado — só encolhe/desaparece junto com a largura da
					 * sidebar (max-w+opacity), em vez de sumir de uma vez (unmount)
					 * no meio da transição de width. */}
					<div
						className={cn(
							"flex flex-col min-w-0 overflow-hidden transition-[max-width,opacity] duration-200 ease-out",
							isCollapsed ? "max-w-0 opacity-0" : "max-w-40 opacity-100",
						)}
					>
						<span className="font-semibold text-lg tracking-tight text-foreground truncate">
							Smart Hub
						</span>
						<span className="text-xs font-medium text-muted-foreground uppercase tracking-wider truncate">
							Hub Ativo: 01
						</span>
					</div>
				</div>

				{/* Navegação Principal */}
				<nav className="flex-1 flex flex-col gap-2 overflow-hidden">
					{navItems.map((item) => {
						const active = isActive(item.path);
						return (
							<Link
								key={item.name}
								to={item.path}
								title={isCollapsed ? item.name : undefined}
								className={cn(
									"flex items-center gap-2 h-10 rounded-lg px-3 text-xs font-medium overflow-hidden transition-colors duration-150",
									active
										? "bg-primary/10 text-foreground ring-1 ring-primary/30 shadow-sm font-semibold"
										: "text-muted-foreground hover:text-foreground hover:bg-card/50",
								)}
							>
								<item.icon
									className={cn(
										"w-4 h-4 shrink-0 transition-colors",
										active ? "text-primary" : "text-muted-foreground",
									)}
								/>
								<span
									className={cn(
										"truncate transition-[max-width,opacity] duration-200 ease-out",
										isCollapsed ? "max-w-0 opacity-0" : "max-w-40 opacity-100",
									)}
								>
									{item.name}
								</span>
							</Link>
						);
					})}

					{/* Botão Configurações */}
					<Link
						to="/settings"
						title={isCollapsed ? "Configurações" : undefined}
						className={cn(
							"flex items-center gap-2 h-10 rounded-lg px-3 text-xs font-medium overflow-hidden transition-colors duration-150 mt-auto",
							isActive("/settings")
								? "bg-primary/10 text-foreground ring-1 ring-primary/30 shadow-sm font-semibold"
								: "text-muted-foreground hover:text-foreground hover:bg-card/50",
						)}
					>
						<Settings className="w-4 h-4 shrink-0" />
						<span
							className={cn(
								"truncate transition-[max-width,opacity] duration-200 ease-out",
								isCollapsed ? "max-w-0 opacity-0" : "max-w-40 opacity-100",
							)}
						>
							Configurações
						</span>
					</Link>
				</nav>
			</div>

			{/* Rodapé: Widget de Status & Ação Rápida */}
			<div className="space-y-3 pt-4 border-t border-border">
				{/* Status Real: Dispositivos Online — sempre montado quando há
				 * dispositivos, só encolhe/funde junto com o resto (evita o
				 * bloco inteiro sumir de golpe no meio da transição). */}
				{totalCount > 0 && (
					<div
						className={cn(
							"rounded-xl bg-surface-highest/60 space-y-3 overflow-hidden transition-[max-height,opacity] duration-200 ease-out",
							isCollapsed
								? "max-h-0 opacity-0 border-0 p-0"
								: "max-h-40 opacity-100 border border-border p-4",
						)}
					>
						<div className="flex items-center justify-between text-xs font-medium tracking-wider uppercase text-muted-foreground">
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
					className="w-full flex h-10 items-center justify-center gap-2 overflow-hidden rounded-lg border border-border bg-surface-highest/40 px-3 text-xs font-medium text-foreground shadow-sm transition-colors duration-150 hover:bg-card hover:border-primary/40 group cursor-pointer"
				>
					<Plus className="w-4 h-4 text-primary group-hover:scale-110 transition-transform shrink-0" />
					<span
						className={cn(
							"truncate transition-[max-width,opacity] duration-200 ease-out",
							isCollapsed ? "max-w-0 opacity-0" : "max-w-40 opacity-100",
						)}
					>
						Adicionar
					</span>
				</button>
			</div>
		</aside>
	);
}
