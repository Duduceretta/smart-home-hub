import { LogOut } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useConfirm } from "@/core/components/providers/ConfirmDialogProvider";
import { Button } from "@/core/components/ui/button";
import { Logger } from "@/core/logger/app.logger";
import { cn } from "@/core/utils";
import { logoutUser } from "../api/auth.api";

export interface LogoutButtonProps {
	className?: string;
	isCollapsed?: boolean;
	variant?: "header" | "sidebar" | "drawer";
	onLogoutSuccess?: () => void;
}

export function LogoutButton({
	className,
	isCollapsed = false,
	variant = "header",
	onLogoutSuccess,
}: LogoutButtonProps = {}) {
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
			onLogoutSuccess?.();
		} catch (error: unknown) {
			if (error instanceof Error) {
				Logger.error("Falha na tentativa de logout via Firebase", error);
				toast.error(
					t(
						"logout.error",
						"Não foi possível sair da conta. Verifique sua conexão.",
					),
				);
			} else {
				Logger.error("Falha crítica e inesperada no logout", error);
				toast.error(
					t("common:status.unexpectedError", "Ocorreu um erro inesperado."),
				);
			}
			setIsLoggingOut(false);
		}
	};

	const label = isLoggingOut ? t("logout.loggingOut") : t("logout.button");

	if (variant === "sidebar") {
		return (
			<button
				type="button"
				onClick={handleLogoutClick}
				disabled={isLoggingOut}
				aria-label={label}
				title={isCollapsed ? label : undefined}
				className={
					className ??
					"relative flex h-10 w-full items-center rounded-lg text-xs font-medium text-muted-foreground hover:bg-alert/10 hover:text-alert active:bg-alert/20 active:scale-[0.98] transition-all duration-100 disabled:opacity-50 cursor-pointer overflow-hidden select-none"
				}
			>
				<div className="w-10 h-10 flex items-center justify-center shrink-0">
					<LogOut className="h-4 w-4 shrink-0" />
				</div>
				<span
					className={cn(
						"truncate whitespace-nowrap transition-all duration-300 ease-in-out pl-1",
						isCollapsed
							? "max-w-0 opacity-0 pointer-events-none"
							: "max-w-40 opacity-100",
					)}
				>
					{label}
				</span>
				{isCollapsed && <span className="sr-only">{label}</span>}
			</button>
		);
	}

	if (variant === "drawer") {
		return (
			<button
				type="button"
				onClick={handleLogoutClick}
				disabled={isLoggingOut}
				aria-label={label}
				className={
					className ??
					"relative flex h-11 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-muted-foreground hover:bg-alert/10 hover:text-alert active:bg-alert/20 active:scale-[0.98] transition-all duration-100 cursor-pointer select-none"
				}
			>
				<LogOut className="h-5 w-5 shrink-0" />
				<span className="truncate flex-1 min-w-0 text-left">{label}</span>
			</button>
		);
	}

	return (
		<Button
			variant="outline"
			type="button"
			onClick={handleLogoutClick}
			disabled={isLoggingOut}
			aria-label={label}
			className={
				className ??
				"h-11! w-11! justify-center gap-2 border-border-subtle bg-surface-container/50 px-0! text-muted-foreground transition-all duration-100 hover:bg-surface-high hover:text-foreground active:scale-95 active:bg-surface-highest disabled:opacity-50 cursor-pointer sm:w-fit! sm:px-2.5! md:h-8! select-none"
			}
		>
			<LogOut className="h-4 w-4 shrink-0" />
			<span className="hidden sm:inline">{label}</span>
		</Button>
	);
}
