import { AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";

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
			className={`flex flex-col items-center justify-center gap-2 rounded-xl border border-alert/50 bg-alert/10 p-6 text-center ${className ?? ""}`}
		>
			<AlertTriangle className="h-6 w-6 text-alert-foreground" />
			<p className="text-sm font-medium text-alert-foreground">{title}</p>
			<p className="max-w-xs text-xs text-muted-foreground">{subtitle}</p>
			<button
				type="button"
				onClick={onRetry}
				className="mt-1 rounded-md border border-border-subtle px-3 py-2 text-xs font-medium uppercase tracking-wider text-foreground transition-colors hover:bg-surface-high cursor-pointer"
			>
				{t("actions.retry", "Tentar novamente")}
			</button>
		</div>
	);
}
