import { Activity, AlertTriangle, Layers, Zap } from "lucide-react";
import type { ElementType } from "react";
import { useTranslation } from "react-i18next";
import { CardErrorFallback } from "@/core/components/feedback/CardErrorFallback";
import { StaleDataIndicator } from "@/core/components/feedback/StaleDataIndicator";
import { cn } from "@/core/utils";
import type { HistoryKpiMetrics } from "../types/history.types";

interface HistoryKpiCardsProps {
	stats: HistoryKpiMetrics | undefined;
	isLoading: boolean;
	isError?: boolean;
	onRetry?: () => void;
}

interface KpiItemProps {
	icon: ElementType;
	label: string;
	value: number | string;
	accentClass: string;
	iconBgClass: string;
	isLoading: boolean;
	showStaleIndicator?: boolean;
}

function KpiItem({
	icon: Icon,
	label,
	value,
	accentClass,
	iconBgClass,
	isLoading,
	showStaleIndicator = false,
}: KpiItemProps) {
	return (
		<div className="flex items-center gap-3.5 rounded-2xl border border-border-subtle bg-surface-low p-4 transition-colors hover:border-border">
			<div
				className={cn(
					"flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors",
					iconBgClass,
				)}
			>
				<Icon className={cn("h-5 w-5", accentClass)} />
			</div>
			<div className="flex min-w-0 flex-col gap-0.5">
				<span className="flex items-center gap-1 truncate text-xs font-medium uppercase tracking-wider text-muted-foreground">
					{label}
					{showStaleIndicator && <StaleDataIndicator />}
				</span>
				{isLoading ? (
					<span className="h-7 w-10 animate-pulse rounded-md bg-surface-high" />
				) : (
					<span
						className={cn(
							"text-2xl font-semibold tracking-tight text-foreground",
							accentClass,
						)}
					>
						{value}
					</span>
				)}
			</div>
		</div>
	);
}

/**
 * Analytical KPI summary row for the History page.
 * Displays total count, automation executions, alerts/errors, and device group actions —
 * aggregated server-side over the whole filtered period (not just the loaded page of events).
 */
export function HistoryKpiCards({
	stats,
	isLoading,
	isError = false,
	onRetry,
}: HistoryKpiCardsProps) {
	const { t } = useTranslation("history");

	if (isError && !stats) {
		return (
			<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
				{[0, 1, 2, 3].map((i) => (
					<CardErrorFallback
						key={i}
						className="h-18 sm:h-24"
						message={t(
							"kpis.errorLoad",
							"Não foi possível carregar os indicadores.",
						)}
						retryLabel={t("timeline.retry", "Tentar novamente")}
						onRetry={() => onRetry?.()}
					/>
				))}
			</div>
		);
	}

	const total = stats?.totalEvents ?? 0;
	const automationCount = stats?.automationCount ?? 0;
	const alertCount = stats?.alertCount ?? 0;
	const groupActionCount = stats?.groupActionCount ?? 0;
	const showStaleIndicator = isError && Boolean(stats);

	return (
		<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
			<KpiItem
				icon={Activity}
				label={t("kpis.totalEvents", "Total de Eventos")}
				value={total}
				accentClass="text-foreground"
				iconBgClass="bg-surface-high text-foreground"
				isLoading={isLoading}
				showStaleIndicator={showStaleIndicator}
			/>
			<KpiItem
				icon={Zap}
				label={t("kpis.automations", "Execuções de Automação")}
				value={automationCount}
				accentClass="text-primary"
				iconBgClass="bg-primary/10 text-primary"
				isLoading={isLoading}
				showStaleIndicator={showStaleIndicator}
			/>
			<KpiItem
				icon={AlertTriangle}
				label={t("kpis.alertsAndErrors", "Alertas e Erros")}
				value={alertCount}
				accentClass={
					alertCount > 0 ? "text-destructive" : "text-muted-foreground"
				}
				iconBgClass={
					alertCount > 0
						? "bg-destructive/10 text-destructive"
						: "bg-surface-high text-muted-foreground"
				}
				isLoading={isLoading}
				showStaleIndicator={showStaleIndicator}
			/>
			<KpiItem
				icon={Layers}
				label={t("kpis.groupActions", "Ações de Grupos")}
				value={groupActionCount}
				accentClass="text-warm"
				iconBgClass="bg-warm/10 text-warm"
				isLoading={isLoading}
				showStaleIndicator={showStaleIndicator}
			/>
		</div>
	);
}
