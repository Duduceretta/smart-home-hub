import { Bell, Menu, Wifi } from "lucide-react";
import { LanguageSelector } from "@/core/components/layouts/LanguageSelector";
import { LogoutButton } from "@/features/auth/components/LogoutButton";
import { useAuthStore } from "@/features/auth/store/useAuthStore";

export function Header() {
	const user = useAuthStore((state) => state.user);
	const firstName = user?.displayName?.split(" ")[0] || "Visitante";

	return (
		<header className="w-full h-14 bg-zinc-950/80 backdrop-blur-xl flex items-center justify-between px-4 sm:px-6 border-b border-zinc-800/80 z-30 shrink-0">
			{/* Lado Esquerdo: Saudação & Status */}
			<div className="flex items-center gap-3">
				<button
					type="button"
					className="md:hidden p-1.5 text-zinc-400 hover:text-zinc-50 hover:bg-zinc-900 rounded-lg transition-colors cursor-pointer"
					aria-label="Abrir menu"
				>
					<Menu className="w-5 h-5" />
				</button>

				<div className="flex items-center gap-3">
					<div className="flex flex-col">
						<span className="text-sm font-semibold tracking-tight text-zinc-100">
							Olá, {firstName}
						</span>
						<span className="hidden sm:block text-[11px] text-zinc-400">
							Smart Home Control
						</span>
					</div>

					{/* Badge de Status do Hub */}
					<div className="hidden lg:flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full text-[10px] font-medium text-emerald-400">
						<span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
						<Wifi className="w-3 h-3" />
						<span>Hub 01 Online</span>
					</div>
				</div>
			</div>

			{/* Lado Direito: Idioma, Notificações & Perfil */}
			<div className="flex items-center gap-2.5 sm:gap-3.5">
				{/* 🌐 Seletor de Idioma */}
				<LanguageSelector />

				{/* Botão de Notificações */}
				<button
					type="button"
					className="relative p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 rounded-full transition-colors cursor-pointer"
					aria-label="Notificações"
				>
					<Bell className="w-4 h-4" />
					<span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-indigo-500 ring-2 ring-zinc-950" />
				</button>

				<div className="hidden sm:block w-px h-5 bg-zinc-800/80" />

				{/* Perfil do Usuário & Logout */}
				<div className="flex items-center gap-3">
					<div className="w-8 h-8 rounded-full bg-zinc-900 border border-indigo-500/20 shadow-sm overflow-hidden shrink-0">
						{user?.photoURL ? (
							<img
								src={user.photoURL}
								alt="Avatar"
								className="w-full h-full object-cover"
							/>
						) : (
							<div className="w-full h-full flex items-center justify-center text-xs text-indigo-400 font-bold uppercase bg-indigo-500/10">
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
