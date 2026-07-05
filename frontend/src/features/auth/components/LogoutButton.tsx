import { LogOut } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { LogoutConfirmModal } from "@/core/components/modals/LogoutConfirmModal";
import { Button } from "@/core/components/ui/button";
import { Logger } from "@/core/logger/app.logger";
import { logoutUser } from "../api/auth.api";

export function LogoutButton() {
	// 1. Estado para abrir/fechar o modal de confirmação
	const [isModalOpen, setIsModalOpen] = useState(false);
	// 2. Estado de loading da requisição no Firebase
	const [isLoggingOut, setIsLoggingOut] = useState(false);

	const handleLogout = async () => {
		setIsLoggingOut(true);
		try {
			await logoutUser();
		} catch (error: unknown) {
			if (error instanceof Error) {
				Logger.error("Falha na tentativa de logout via Firebase", error);
				toast.error("Não foi possível sair da conta. Verifique sua conexão.");
			} else {
				Logger.error("Falha crítica e inesperada no logout", error);
				toast.error("Ocorreu um erro inesperado.");
			}
			setIsLoggingOut(false);
			setIsModalOpen(false);
		}
	};

	return (
		<>
			<Button
				variant="outline"
				type="button"
				onClick={() => setIsModalOpen(true)}
				disabled={isLoggingOut}
				className="flex items-center gap-2 border-zinc-800 bg-zinc-950/50 text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-zinc-50 disabled:opacity-50 cursor-pointer"
			>
				<LogOut className="h-4 w-4" />
				{isLoggingOut ? "Saindo..." : "Sair"}
			</Button>

			<LogoutConfirmModal
				isOpen={isModalOpen}
				onClose={() => setIsModalOpen(false)}
				onConfirm={handleLogout}
				isLoading={isLoggingOut}
			/>
		</>
	);
}
