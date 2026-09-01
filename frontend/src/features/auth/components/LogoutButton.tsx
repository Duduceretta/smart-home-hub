import { LogOut } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useConfirm } from "@/core/components/providers/ConfirmDialogProvider";
import { Button } from "@/core/components/ui/button";
import { Logger } from "@/core/logger/app.logger";
import { logoutUser } from "../api/auth.api";

export function LogoutButton() {
	const { t } = useTranslation(["auth", "common"]);
	const [isLoggingOut, setIsLoggingOut] = useState(false);
	const confirm = useConfirm();

	const handleLogoutClick = async () => {
		const confirmed = await confirm({
			title: t("logout.confirmTitle"),
			description: t("logout.confirmDescription"),
			confirmLabel: t("logout.confirmYes"),
			cancelLabel: t("common:actions.cancel"),
			variant: "destructive",
			icon: LogOut,
		});
		if (!confirmed) return;

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
		}
	};

	return (
		<Button
			variant="outline"
			type="button"
			onClick={handleLogoutClick}
			disabled={isLoggingOut}
			aria-label={isLoggingOut ? t("logout.loggingOut") : t("logout.button")}
			className="h-11! w-11! justify-center gap-2 border-zinc-800 bg-zinc-950/50 px-0! text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-zinc-50 disabled:opacity-50 cursor-pointer sm:w-fit! sm:px-2.5! md:h-8!"
		>
			<LogOut className="h-4 w-4 shrink-0" />
			<span className="hidden sm:inline">
				{isLoggingOut ? t("logout.loggingOut") : t("logout.button")}
			</span>
		</Button>
	);
}
