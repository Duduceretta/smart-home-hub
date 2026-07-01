import { Bell, Menu } from "lucide-react";
import { LogoutButton } from "@/features/auth/components/LogoutButton";
import { useAuthStore } from "@/features/auth/store/useAuthStore";
// import { LogoutButton } from "@/features/auth/components/LogoutButton";

export function Header() {
	// Puxa o usuário logado lá do Zustand!
	const user = useAuthStore((state) => state.user);

	// Extrai o primeiro nome ou usa "Visitante"
	const firstName = user?.displayName?.split(" ")[0] || "Visitante";

	return (
		<header className="w-full h-16 bg-zinc-950/80 backdrop-blur-xl flex items-center justify-between px-4 md:px-8 border-b border-zinc-800/80 z-30 shrink-0">
			{/* Lado Esquerdo */}
			<div className="flex items-center gap-4">
				{/* 👇 Adicione aqui */}
				<button
					type="button"
					className="md:hidden p-2 text-zinc-400 hover:text-zinc-50 hover:bg-zinc-900 rounded-lg transition-colors"
				>
					<Menu className="w-5 h-5" />
				</button>
				<div className="flex flex-col">
					<span className="text-lg font-bold tracking-tight text-zinc-50">
						Olá, {firstName}
					</span>
					<span className="hidden sm:block text-xs text-zinc-400">
						Sistema Operacional
					</span>
				</div>
			</div>

			{/* Lado Direito */}
			<div className="flex items-center gap-4 md:gap-6">
				{/* 👇 Adicione aqui */}
				<button
					type="button"
					className="relative p-2 text-zinc-400 hover:text-zinc-50 hover:bg-zinc-900 rounded-full transition-colors"
				>
					<Bell className="w-5 h-5" />
					<span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-indigo-500 border-2 border-zinc-950"></span>
				</button>

				<div className="hidden sm:block w-px h-6 bg-zinc-800"></div>

				<div className="flex items-center gap-3">
					<div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 overflow-hidden">
						{user?.photoURL ? (
							<img
								src={user.photoURL}
								alt="Avatar"
								className="w-full h-full object-cover"
							/>
						) : (
							<div className="w-full h-full flex items-center justify-center text-xs text-zinc-400 font-bold uppercase">
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
