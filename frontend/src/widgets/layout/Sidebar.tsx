import { Plus, X } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { NexusHubMonogram, NexusHubWordmark } from "@/core/components/brand";
import { Ripple, useRipple } from "@/core/components/feedback/Ripple";
import { Progress } from "@/core/components/ui/progress";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/core/components/ui/tooltip";
import { cn } from "@/core/utils";
import { LogoutButton } from "@/features/auth/components/LogoutButton";
import { useDevices } from "@/features/devices/hooks/useDevices";
import { isRouteActive, NAV_SECTIONS, type NavItem } from "./nav.types";

const SIDEBAR_STORAGE_KEY = "nexus_sidebar_collapsed";

interface NavTooltipProps {
	content: React.ReactNode;
	children: React.ReactElement;
	enabled: boolean;
}

function NavTooltip({ content, children, enabled }: NavTooltipProps) {
	const [isOpen, setIsOpen] = useState(false);

	if (!enabled) {
		return children;
	}

	return (
		<Tooltip open={isOpen} onOpenChange={setIsOpen}>
			<TooltipTrigger asChild>{children}</TooltipTrigger>
			<TooltipContent side="right" sideOffset={12}>
				{content}
			</TooltipContent>
		</Tooltip>
	);
}

interface NavItemDesktopProps {
	item: NavItem;
	isActive: boolean;
	isCollapsed: boolean;
}

function NavItemDesktop({ item, isActive, isCollapsed }: NavItemDesktopProps) {
	const { ripples, createRipple, removeRipple } = useRipple();

	return (
		<NavTooltip enabled={isCollapsed} content={item.name}>
			<Link
				to={item.path}
				onClick={(e) => {
					if (isActive) {
						e.preventDefault();
					}
				}}
				onPointerDown={createRipple}
				aria-label={isCollapsed ? item.name : undefined}
				aria-current={isActive ? "page" : undefined}
				className={cn(
					"group/nav-item relative flex h-10 w-full items-center rounded-lg text-xs font-medium transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-primary/40 overflow-hidden cursor-pointer select-none active:scale-[0.98]",
					isActive
						? "bg-primary/10 text-foreground font-semibold"
						: "text-muted-foreground hover:text-foreground hover:bg-surface-highest/40 active:text-foreground",
				)}
			>
				{/* Onda circular estilo MUI Ripple */}
				<Ripple ripples={ripples} onClear={removeRipple} />

				{isActive && (
					<span
						className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-primary"
						aria-hidden="true"
					/>
				)}
				<div className="w-10 h-10 flex items-center justify-center shrink-0 relative z-10 pointer-events-none">
					<item.icon
						className={cn(
							"w-4.5 h-4.5 shrink-0 transition-colors",
							isActive ? "text-primary" : "text-muted-foreground",
						)}
					/>
				</div>
				<span
					className={cn(
						"truncate whitespace-nowrap transition-all duration-300 ease-in-out pl-1 relative z-10 pointer-events-none",
						isCollapsed
							? "max-w-0 opacity-0 pointer-events-none -translate-x-1"
							: "max-w-36 opacity-100 translate-x-0",
					)}
				>
					{item.name}
				</span>
			</Link>
		</NavTooltip>
	);
}

interface LogoToggleButtonProps {
	isCollapsed: boolean;
	onToggle: () => void;
}

function LogoToggleButton({ isCollapsed, onToggle }: LogoToggleButtonProps) {
	const { ripples, createRipple, removeRipple } = useRipple();

	return (
		<button
			type="button"
			onPointerDown={createRipple}
			onClick={onToggle}
			aria-expanded={!isCollapsed}
			aria-label={
				isCollapsed ? "Expandir barra lateral" : "Recolher barra lateral"
			}
			title={isCollapsed ? "Expandir barra lateral" : "Recolher barra lateral"}
			className="relative flex items-center h-10 w-full overflow-hidden rounded-lg hover:bg-surface-highest/40 active:scale-[0.98] transition-all duration-100 cursor-pointer text-left outline-none focus-visible:ring-2 focus-visible:ring-primary/40 group/logo translate-y-[3px] select-none"
		>
			<Ripple ripples={ripples} onClear={removeRipple} />
			<div className="w-10 h-10 flex items-center justify-center shrink-0 relative z-10 pointer-events-none">
				<NexusHubMonogram
					variant="bare"
					className="h-5 w-auto shrink-0 transition-transform group-hover/logo:scale-105"
				/>
			</div>
			<div
				className={cn(
					"flex items-center min-w-0 overflow-hidden transition-all duration-300 ease-in-out relative z-10 pointer-events-none",
					isCollapsed
						? "max-w-0 opacity-0 pl-0 pointer-events-none"
						: "max-w-44 opacity-100 pl-3",
				)}
			>
				<NexusHubWordmark className="h-4.5 w-auto text-foreground shrink-0" />
			</div>
		</button>
	);
}

interface AddDeviceQuickActionProps {
	isCollapsed: boolean;
	onNavigate: () => void;
}

function AddDeviceQuickAction({
	isCollapsed,
	onNavigate,
}: AddDeviceQuickActionProps) {
	const { ripples, createRipple, removeRipple } = useRipple();

	return (
		<NavTooltip enabled={isCollapsed} content="Adicionar dispositivos">
			<button
				type="button"
				onPointerDown={createRipple}
				onClick={onNavigate}
				aria-label="Adicionar dispositivos"
				className="relative flex h-10 w-full items-center rounded-lg border border-border bg-surface-highest/40 text-foreground transition-all duration-100 hover:bg-surface-high hover:border-border active:scale-[0.97] active:border-primary/40 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 overflow-hidden select-none"
			>
				<Ripple ripples={ripples} onClear={removeRipple} />
				<div className="w-10 h-10 flex items-center justify-center shrink-0 relative z-10 pointer-events-none">
					<Plus className="w-4 h-4 text-primary shrink-0 transition-transform group-hover:rotate-90" />
				</div>
				<span
					className={cn(
						"text-xs font-medium whitespace-nowrap overflow-hidden transition-all duration-300 ease-in-out pl-1 relative z-10 pointer-events-none",
						isCollapsed
							? "max-w-0 opacity-0 pointer-events-none"
							: "max-w-44 opacity-100",
					)}
				>
					Adicionar Dispositivo
				</span>
			</button>
		</NavTooltip>
	);
}

export function Sidebar() {
	const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
		if (typeof window === "undefined") return false;
		try {
			const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY);
			if (stored !== null) return stored === "true";
		} catch {
			// Silencia falha de acesso ao localStorage
		}
		return false;
	});

	const location = useLocation();
	const navigate = useNavigate();
	const { data } = useDevices({ pageSize: 200 });
	const devices = data?.items ?? [];

	const isActive = (path: string) => isRouteActive(location.pathname, path);

	const totalCount = devices.length;
	const onlineCount = devices.filter((d) => d.isOnline).length;
	const onlineRatio =
		totalCount > 0 ? Math.round((onlineCount / totalCount) * 100) : 0;

	const toggleCollapse = () => {
		setIsCollapsed((prev) => {
			const next = !prev;
			try {
				localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
			} catch {
				// Silencia erro em ambientes restritos
			}
			return next;
		});
	};

	return (
		<aside
			aria-label="Navegação Principal"
			className={cn(
				"hidden md:flex flex-col h-full border-r border-border bg-linear-to-b from-card via-card/95 to-surface-low/95 z-40 shrink-0 relative transition-[width] duration-300 ease-in-out text-foreground will-change-[width] px-4 pb-3",
				isCollapsed ? "w-18" : "w-64",
			)}
		>
			{/* Top Section: Logo (altura 54px para alinhar a divisória com o Header em y = 64px) */}
			<div className="h-13.5 flex items-center shrink-0">
				<LogoToggleButton isCollapsed={isCollapsed} onToggle={toggleCollapse} />
			</div>

			{/* Navegação Principal em Seções com respiro lateral anti-corte */}
			<nav
				aria-label="Menu Lateral"
				className="flex-1 flex flex-col gap-4 overflow-y-auto scrollbar-thin px-0 pt-0"
			>
				{NAV_SECTIONS.map((section) => (
					<div key={section.id} className="flex flex-col gap-1">
						{/* Título de Seção com linha contínua e palavra centralizada sem saltos */}
						{section.title && (
							<div className="h-5 flex items-center select-none my-0 relative overflow-hidden">
								<div className="w-full h-px bg-border" aria-hidden="true" />
								<div
									className={cn(
										"absolute inset-0 flex items-center justify-center transition-all duration-300 ease-in-out",
										isCollapsed
											? "opacity-0 scale-95 pointer-events-none"
											: "opacity-100 scale-100",
									)}
								>
									<span className="bg-card px-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 whitespace-nowrap">
										{section.title}
									</span>
								</div>
							</div>
						)}

						{/* Itens da Seção */}
						<div className="flex flex-col gap-1">
							{section.items.map((item: NavItem) => (
								<NavItemDesktop
									key={item.id}
									item={item}
									isActive={isActive(item.path)}
									isCollapsed={isCollapsed}
								/>
							))}
						</div>
					</div>
				))}

				{/* Botão Sair posicionado acima da última linha divisória */}
				<div className="pt-1 mt-auto">
					<NavTooltip enabled={isCollapsed} content="Sair da conta">
						<div>
							<LogoutButton variant="sidebar" isCollapsed={isCollapsed} />
						</div>
					</NavTooltip>
				</div>
			</nav>

			{/* Rodapé (abaixo da última linha): Status de Dispositivos & Ação Rápida */}
			<div className="space-y-2 pt-3 border-t border-border shrink-0">
				{/* Status: Dispositivos Online (Container unificado de largura total sem saltos) */}
				<NavTooltip
					enabled={isCollapsed}
					content={`Dispositivos Online: ${onlineCount}/${totalCount}`}
				>
					<div
						role="status"
						aria-label={`Dispositivos Online: ${onlineCount}/${totalCount}`}
						className={cn(
							"relative overflow-hidden border border-border bg-surface-highest/40 text-foreground transition-[height,padding] duration-300 ease-in-out cursor-default hover:bg-surface-high/60 w-full rounded-lg",
							isCollapsed ? "h-10 p-1" : "h-12 p-2.5 rounded-xl",
						)}
					>
						{/* Vista compacta (colapsada) */}
						<div
							className={cn(
								"absolute inset-0 flex flex-col items-center justify-center transition-opacity duration-300",
								isCollapsed ? "opacity-100" : "opacity-0 pointer-events-none",
							)}
						>
							<span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)] animate-pulse" />
							<span className="text-[10px] font-bold text-primary tabular-nums mt-0.5">
								{onlineCount}/{totalCount}
							</span>
						</div>

						{/* Vista expandida */}
						<div
							className={cn(
								"flex flex-col justify-between h-full transition-opacity duration-300 whitespace-nowrap",
								isCollapsed ? "opacity-0 pointer-events-none" : "opacity-100",
							)}
						>
							<div className="flex items-center justify-between text-[10px] font-medium tracking-wider uppercase text-muted-foreground">
								<span className="flex items-center gap-1.5 truncate">
									<span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)] animate-pulse shrink-0" />
									<span>Dispositivos</span>
								</span>
								<span className="text-primary font-semibold tabular-nums shrink-0">
									{onlineCount}/{totalCount}
								</span>
							</div>
							<Progress value={onlineRatio} className="h-1.5 bg-background" />
						</div>
					</div>
				</NavTooltip>

				{/* Ação Rápida: Adicionar dispositivos */}
				<AddDeviceQuickAction
					isCollapsed={isCollapsed}
					onNavigate={() => navigate("/devices")}
				/>
			</div>

			{/* Linha divisória interativa (borda direita): cursor col-resize para colapsar/expandir */}
			<button
				type="button"
				onClick={toggleCollapse}
				aria-label={
					isCollapsed
						? "Expandir painel lateral pela borda"
						: "Recolher painel lateral pela borda"
				}
				title={
					isCollapsed ? "Expandir barra lateral" : "Recolher barra lateral"
				}
				className="absolute -right-1.5 top-0 bottom-0 w-3 cursor-col-resize z-50 group/resizer flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
			>
				<span className="w-px h-full bg-transparent group-hover/resizer:bg-foreground/20 transition-colors duration-150" />
			</button>
		</aside>
	);
}

interface NavItemMobileProps {
	item: NavItem;
	isActive: boolean;
	onClose: () => void;
}

function NavItemMobile({ item, isActive, onClose }: NavItemMobileProps) {
	const { ripples, createRipple, removeRipple } = useRipple();

	const handleClick = (e: React.MouseEvent) => {
		if (isActive) {
			e.preventDefault();
		}
		setTimeout(() => {
			onClose();
		}, 160);
	};

	return (
		<Link
			to={item.path}
			onPointerDown={createRipple}
			onClick={handleClick}
			onContextMenu={(e) => e.preventDefault()}
			draggable={false}
			aria-current={isActive ? "page" : undefined}
			className={cn(
				"group/drawer-item relative flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-primary/40 select-none cursor-pointer overflow-hidden active:scale-[0.98]",
				isActive
					? "bg-primary/10 text-foreground font-semibold"
					: "text-muted-foreground hover:text-foreground hover:bg-surface-highest/40 active:text-foreground",
			)}
		>
			{/* Onda circular estilo MUI Ripple */}
			<Ripple ripples={ripples} onClear={removeRipple} />

			{isActive && (
				<span
					className="absolute left-0 top-2.5 bottom-2.5 w-1 rounded-r-full bg-primary"
					aria-hidden="true"
				/>
			)}
			<item.icon
				className={cn(
					"h-5 w-5 shrink-0 transition-colors relative z-10 pointer-events-none",
					isActive ? "text-primary" : "text-muted-foreground",
				)}
			/>
			<span className="truncate flex-1 min-w-0 relative z-10 pointer-events-none">
				{item.name}
			</span>
		</Link>
	);
}

export interface MobileSidebarSheetProps {
	isOpen: boolean;
	onClose: () => void;
}

/**
 * Drawer lateral mobile (<768px).
 * Desliza da esquerda cobrindo ~82vw (max 320px) com backdrop escurecido,
 * focus trap integrado, suporte a swipe para fechar e tecla Escape.
 */
export function MobileNavigationDrawer({
	isOpen,
	onClose,
}: MobileSidebarSheetProps) {
	const location = useLocation();
	const isActive = (path: string) => isRouteActive(location.pathname, path);

	const { data } = useDevices({ pageSize: 200 });
	const devices = data?.items ?? [];
	const totalCount = devices.length;
	const onlineCount = devices.filter((d) => d.isOnline).length;
	const onlineRatio =
		totalCount > 0 ? Math.round((onlineCount / totalCount) * 100) : 0;

	const touchStartX = useRef<number | null>(null);

	const handleTouchStart = (e: React.TouchEvent) => {
		if (e.touches && e.touches.length > 0 && e.touches[0]) {
			touchStartX.current = e.touches[0].clientX;
		}
	};

	const handleTouchEnd = (e: React.TouchEvent) => {
		if (touchStartX.current === null) return;
		const clientX = e.changedTouches?.[0]?.clientX;
		if (clientX !== undefined) {
			const deltaX = clientX - touchStartX.current;
			// Swipe para a esquerda fecha o drawer
			if (deltaX < -50) {
				onClose();
			}
		}
		touchStartX.current = null;
	};

	const handleTouchCancel = () => {
		touchStartX.current = null;
	};

	return (
		<DialogPrimitive.Root
			open={isOpen}
			onOpenChange={(open) => !open && onClose()}
		>
			<DialogPrimitive.Portal>
				{/* Backdrop escurecido semi-transparente */}
				<DialogPrimitive.Overlay
					data-slot="drawer-overlay"
					className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs duration-200 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0"
				/>

				{/* Painel lateral deslizando da esquerda */}
				<DialogPrimitive.Content
					data-slot="drawer-content"
					id="mobile-navigation-drawer"
					onTouchStart={handleTouchStart}
					onTouchEnd={handleTouchEnd}
					onTouchCancel={handleTouchCancel}
					onContextMenu={(e) => e.preventDefault()}
					aria-label="Menu de Navegação Principal"
					className="fixed inset-y-0 left-0 z-50 flex h-full w-[82vw] max-w-xs flex-col border-r border-border bg-card p-4 text-foreground shadow-2xl duration-250 ease-out outline-none data-[state=open]:animate-in data-[state=open]:slide-in-from-left data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left"
				>
					<DialogPrimitive.Title className="sr-only">
						Menu de Navegação Principal
					</DialogPrimitive.Title>
					<DialogPrimitive.Description className="sr-only">
						Navegue pelas áreas principais, configurações e ações do Nexus Hub
					</DialogPrimitive.Description>

					{/* Cabeçalho do Drawer: Marca Nexus Hub sem fundo escuro & Fechar */}
					<div className="flex items-center justify-between pb-2 shrink-0">
						<div className="flex items-center gap-2.5 select-none">
							<NexusHubMonogram variant="bare" className="h-5 w-auto" />
							<NexusHubWordmark className="h-4.5 w-auto text-foreground" />
						</div>

						<DialogPrimitive.Close asChild>
							<button
								type="button"
								onClick={onClose}
								aria-label="Fechar menu de navegação"
								className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-surface-highest/50 hover:text-foreground active:scale-90 active:bg-surface-highest/80 transition-all duration-100 cursor-pointer select-none"
							>
								<X className="h-5 w-5" />
							</button>
						</DialogPrimitive.Close>
					</div>

					{/* Corpo Rolável com Seções */}
					<nav
						aria-label="Navegação Lateral Mobile"
						className="flex-1 flex flex-col overflow-y-auto py-2 gap-4 scrollbar-thin px-1"
					>
						{NAV_SECTIONS.map((section) => (
							<div key={section.id} className="space-y-1">
								{section.title && (
									<div className="flex items-center gap-2 px-2 py-1 select-none">
										<div className="flex-1 h-px bg-border" aria-hidden="true" />
										<span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 shrink-0">
											{section.title}
										</span>
										<div className="flex-1 h-px bg-border" aria-hidden="true" />
									</div>
								)}

								<div className="space-y-1">
									{section.items.map((item) => (
										<NavItemMobile
											key={item.id}
											item={item}
											isActive={isActive(item.path)}
											onClose={onClose}
										/>
									))}
								</div>
							</div>
						))}

						{/* Botão Sair no mobile fixado lá embaixo, acima da linha dos dispositivos */}
						<div className="pt-4 mt-auto">
							<LogoutButton variant="drawer" onLogoutSuccess={onClose} />
						</div>
					</nav>

					{/* Rodapé do Drawer: Status de Dispositivos abaixo da última linha */}
					{totalCount > 0 && (
						<div className="pt-3 border-t border-border space-y-3 shrink-0 select-none">
							<div className="rounded-xl bg-surface-highest/40 border border-border p-3 space-y-2">
								<div className="flex items-center justify-between text-[10px] font-medium tracking-wider uppercase text-muted-foreground">
									<span>Dispositivos Online</span>
									<span className="text-primary font-semibold">
										{onlineCount}/{totalCount}
									</span>
								</div>
								<Progress value={onlineRatio} className="h-1.5 bg-background" />
							</div>
						</div>
					)}
				</DialogPrimitive.Content>
			</DialogPrimitive.Portal>
		</DialogPrimitive.Root>
	);
}

// Alias para compatibilidade com importações anteriores
export const MobileSidebarSheet = MobileNavigationDrawer;
