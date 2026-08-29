import { ShieldAlert, Thermometer, Wifi, Zap } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useDashboardOverview } from "../hooks/useDashboardOverview";
import { formatEnergy } from "../lib/formatEnergy";
import { DashboardErrorState } from "./DashboardErrorState";

export function StatusHubSummary() {
	const { t } = useTranslation("dashboard");
	const { data, isLoading, isError, refetch } = useDashboardOverview();

	if (isLoading) {
		return (
			<div className="grid grid-cols-2 gap-4 lg:grid-cols-4 animate-pulse">
				{["energy", "devices", "temperature", "alerts"].map((metricKey) => (
					<div
						key={`skeleton-${metricKey}`}
						className="flex h-24 flex-col justify-between rounded-xl border border-border-subtle bg-surface-container p-4"
					>
						<div className="h-3 w-20 rounded-md bg-surface-high" />
						<div className="h-6 w-16 rounded-md bg-surface-high" />
					</div>
				))}
			</div>
		);
	}

	if (isError || !data) {
		return (
			<DashboardErrorState
				title={t(
					"metrics.errorTitle",
					"Não foi possível carregar os indicadores",
				)}
				subtitle={t(
					"metrics.errorSubtitle",
					"Verifique sua conexão e tente novamente.",
				)}
				onRetry={() => refetch()}
			/>
		);
	}

	const { summary } = data;
	const energy = formatEnergy(summary.energyConsumptionKwh);

	return (
		<div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
			{/* Card 1: Consumo Acumulado */}
			<div className="flex flex-col justify-between gap-4 rounded-xl border border-border-subtle bg-surface-container p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-border">
				<div className="flex items-center justify-between">
					<span className="min-w-0 flex-1 truncate text-xs font-semibold uppercase tracking-wider text-muted-foreground">
						{t("metrics.energyConsumption")}
					</span>
					<Zap className="h-4 w-4 shrink-0 text-amber-400" />
				</div>
				<div className="flex flex-col gap-0.5">
					<div>
						<span
							className="text-2xl font-bold tracking-tight text-foreground"
							title={
								summary.isEnergyEstimated
									? t(
											"metrics.energyEstimatedTitle",
											"Inclui consumo estimado de dispositivos sem sensor de energia (ex: TV)",
										)
									: undefined
							}
						>
							{summary.isEnergyEstimated && "~"}
							{energy.value}
						</span>
						<span className="ml-1 text-xs font-medium text-muted-foreground">
							{energy.unit}
						</span>
					</div>
					<span className="truncate text-[11px] text-muted-foreground">
						{t("metrics.energyConsumptionSubtitle", "Acumulado hoje")}
						{summary.isEnergyEstimated &&
							` · ${t("metrics.energyEstimatedShort", "inclui estimativa")}`}
					</span>
				</div>
			</div>

			{/* Card 2: Dispositivos Online (Card Destaque) */}
			<div className="relative flex flex-col justify-between gap-4 overflow-hidden rounded-xl border border-primary/30 bg-surface-container p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/50">
				<div className="pointer-events-none absolute inset-0 bg-linear-to-br from-primary/5 to-transparent" />
				<div className="relative z-10 flex items-center justify-between">
					<span className="min-w-0 flex-1 truncate text-xs font-semibold uppercase tracking-wider text-muted-foreground">
						{t("metrics.onlineDevices")}
					</span>
					<Wifi className="h-4 w-4 shrink-0 text-primary" />
				</div>
				<div className="relative z-10 flex flex-col gap-2.5">
					<div>
						<span className="text-2xl font-bold tracking-tight text-foreground">
							{summary.onlineDevicesCount}
						</span>
						<span className="ml-1 text-xs font-medium text-muted-foreground">
							{t("metrics.activeOf", { total: summary.totalDevicesCount })}
						</span>
					</div>
					<div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-low">
						<div
							className="h-full rounded-full bg-primary transition-all duration-500"
							style={{
								width: `${summary.totalDevicesCount > 0 ? (summary.onlineDevicesCount / summary.totalDevicesCount) * 100 : 0}%`,
							}}
						/>
					</div>
				</div>
			</div>

			{/* Card 3: Temperatura Média */}
			<div className="flex flex-col justify-between gap-4 rounded-xl border border-border-subtle bg-surface-container p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-border">
				<div className="flex items-center justify-between">
					<span className="min-w-0 flex-1 truncate text-xs font-semibold uppercase tracking-wider text-muted-foreground">
						{t("metrics.averageTemperature")}
					</span>
					<Thermometer className="h-4 w-4 shrink-0 text-sky-400" />
				</div>
				<div className="flex items-baseline gap-2">
					<span className="text-2xl font-bold tracking-tight text-foreground">
						{Math.round(summary.averageTemperatureCelsius)}°C
					</span>
					<span className="rounded-md border border-border-subtle bg-surface-low px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-foreground">
						{summary.temperatureTrend > 0 ? "+" : ""}
						{summary.temperatureTrend}°C
					</span>
				</div>
			</div>

			{/* Card 4: Alertas de Segurança */}
			<div className="flex flex-col justify-between gap-4 rounded-xl border border-border-subtle bg-surface-container p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-border">
				<div className="flex items-center justify-between">
					<span className="min-w-0 flex-1 truncate text-xs font-semibold uppercase tracking-wider text-muted-foreground">
						{t("metrics.securityAlerts")}
					</span>
					<ShieldAlert
						className={`h-4 w-4 shrink-0 ${
							summary.activeAlertsCount > 0
								? "text-destructive"
								: "text-muted-foreground"
						}`}
					/>
				</div>
				<div>
					<span
						className={`text-2xl font-bold tracking-tight ${
							summary.activeAlertsCount > 0
								? "text-destructive"
								: "text-foreground"
						}`}
					>
						{summary.activeAlertsCount}
					</span>
					<span className="ml-1 text-xs font-medium text-muted-foreground">
						{t("metrics.alertsUnit")}
					</span>
				</div>
			</div>
		</div>
	);
}
