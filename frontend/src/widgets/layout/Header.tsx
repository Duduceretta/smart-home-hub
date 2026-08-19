import { Bell, Menu, Wifi } from "lucide-react";
import { LanguageSelector } from "@/core/components/layouts/LanguageSelector";
import { Button } from "@/core/components/ui/button";
import { LogoutButton } from "@/features/auth/components/LogoutButton";
import { useAuthStore } from "@/features/auth/store/useAuthStore";

export function Header() {
	const user = useAuthStore((state) => state.user);
	const firstName = user?.displayName?.split(" ")[0] || "Visitante";

	return (
		<header className="sticky top-0 z-40 h-16 w-full border-b border-border bg-linear-to-b from-card/70 to-background/80 backdrop-blur-xl px-4 sm:px-8 flex items-center justify-between shrink-0">
			{/* Lado Esquerdo: Toggle Mobile, Saudação & Status */}
			<div className="flex items-center gap-3">
				{/* Menu Mobile */}
				<Button
					variant="ghost"
					size="icon"
					className="md:hidden h-9 w-9 text-muted-foreground hover:text-foreground"
					aria-label="Abrir menu"
				>
					<Menu className="w-5 h-5" />
				</Button>

				<div className="flex items-center gap-3">
					<div className="flex flex-col">
						<span className="text-sm font-semibold tracking-tight text-foreground">
							Olá, {firstName}
						</span>
						<span className="hidden sm:block text-[11px] font-medium text-muted-foreground">
							Smart Home Control
						</span>
					</div>

					{/* Badge de Status do Hub (Estilo Mock) */}
					<div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/80 border border-border text-xs font-medium text-secondary-foreground shadow-xs">
						<span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" />
						<Wifi className="w-3 h-3 text-muted-foreground" />
						<span>HUB 01 ONLINE</span>
					</div>
				</div>
			</div>

			{/* Lado Direito: Idioma, Notificações, Perfil & Logout */}
			<div className="flex items-center gap-3 sm:gap-4">
				{/* Seletor de Idioma */}
				<LanguageSelector />

				{/* Botão de Notificações */}
				<Button
					variant="outline"
					size="icon"
					className="h-9 w-9 rounded-full relative border-border bg-card/50 text-muted-foreground hover:text-foreground hover:bg-card"
					aria-label="Notificações"
				>
					<Bell className="w-4 h-4" />
					<span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive shadow-xs" />
				</Button>

				<div className="hidden sm:block w-px h-5 bg-border/60" />

				{/* Perfil do Usuário & Logout */}
				<div className="flex items-center gap-3">
					<div className="w-8 h-8 rounded-full bg-card border border-border shadow-xs overflow-hidden shrink-0 flex items-center justify-center">
						{user?.photoURL ? (
							<img
								src={user.photoURL}
								alt="Avatar"
								className="w-full h-full object-cover"
							/>
						) : (
							<div className="w-full h-full flex items-center justify-center text-xs text-primary font-bold uppercase bg-primary/10">
								{firstName.charAt(0)}
							</div>
						)}
					</div>

					<LogoutButton />
				</div>
			</div>
		</header>
	);
}
