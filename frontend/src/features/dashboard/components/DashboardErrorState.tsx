import { AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/core/utils";

interface DashboardErrorStateProps {
	title: string;
	subtitle: string;
	onRetry: () => void;
	className?: string;
}

/**
 * Estado de erro compartilhado entre os cards da dashboard que dependem de
 * useDashboardOverview/useActivityLog — usa os tokens de alerta (Warm Dark
 * Surface) em vez da paleta legada zinc/red usada em RoomsGrid/DeviceGroupsGrid,
 * pra ficar visualmente consistente com o resto da dashboard já migrada.
 */
export function DashboardErrorState({
	title,
	subtitle,
	onRetry,
	className,
}: DashboardErrorStateProps) {
	const { t } = useTranslation("common");

	return (
		<div
			className={cn(
				"flex flex-col items-center justify-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-center",
				className,
			)}
		>
			<AlertTriangle className="h-6 w-6 text-destructive" />
			<p className="text-sm font-semibold text-destructive">{title}</p>
			<p className="max-w-xs text-xs text-muted-foreground">{subtitle}</p>
			<button
				type="button"
				onClick={onRetry}
				className="mt-2 rounded-md border border-border-subtle bg-surface-container px-3 py-1.5 text-xs font-medium uppercase tracking-wider text-foreground transition-all hover:border-primary/40 hover:bg-surface-high cursor-pointer"
			>
				{t("actions.retry", "Tentar novamente")}
			</button>
		</div>
	);
}
