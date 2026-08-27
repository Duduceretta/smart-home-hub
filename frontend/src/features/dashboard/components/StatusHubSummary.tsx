import { ShieldAlert, Thermometer, Wifi, Zap } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useDashboardOverview } from "../hooks/useDashboardOverview";
import { formatEnergy } from "../utils/formatEnergy";
import { DashboardErrorState } from "./DashboardErrorState";

export function StatusHubSummary() {
	const { t } = useTranslation("dashboard");
	const { data, isLoading, isError, refetch } = useDashboardOverview();

	if (isLoading) {
		return (
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
				{["energy", "devices", "temperature", "alerts"].map((metricKey) => (
					<div
						key={`skeleton-${metricKey}`}
						className="h-24 rounded-xl border border-border-subtle/20 bg-surface-container p-4 flex flex-col justify-between"
					>
						<div className="h-3 w-20 bg-surface-high rounded-md" />
						<div className="h-6 w-16 bg-surface-high rounded-md" />
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
		<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
			<div className="rounded-xl border border-border-subtle/20 bg-surface-container p-4 flex flex-col justify-between gap-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-lg hover:shadow-black/30">
				<div className="flex items-center justify-between">
					<span className="min-w-0 flex-1 truncate text-xs font-medium tracking-wider text-muted-foreground uppercase">
						{t("metrics.energyConsumption")}
					</span>
					<Zap className="w-4 h-4 shrink-0 text-warm" />
				</div>
				<div className="flex flex-col gap-0.5">
					<div>
						<span
							className="text-2xl font-semibold text-foreground"
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
						<span className="text-xs text-muted-foreground ml-1">
							{energy.unit}
						</span>
					</div>
					<span className="text-xs text-muted-foreground/60">
						{t("metrics.energyConsumptionSubtitle", "Acumulado hoje")}
						{summary.isEnergyEstimated &&
							` · ${t("metrics.energyEstimatedShort", "inclui estimativa")}`}
					</span>
				</div>
			</div>

			<div className="rounded-xl border border-primary/30 bg-surface-container p-4 flex flex-col justify-between gap-4 relative overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-lg hover:shadow-black/30">
				<div className="absolute inset-0 bg-linear-to-br from-primary/[0.06] to-transparent pointer-events-none" />
				<div className="flex items-center justify-between relative z-10">
					<span className="min-w-0 flex-1 truncate text-xs font-medium tracking-wider text-muted-foreground uppercase">
						{t("metrics.onlineDevices")}
					</span>
					<Wifi className="w-4 h-4 shrink-0 text-primary" />
				</div>
				<div className="relative z-10 flex flex-col gap-3">
					<div>
						<span className="text-2xl font-semibold text-primary">
							{summary.onlineDevicesCount}
						</span>
						<span className="text-xs text-muted-foreground ml-1">
							{t("metrics.activeOf", { total: summary.totalDevicesCount })}
						</span>
					</div>
					<div className="h-1 w-full rounded-full bg-background overflow-hidden">
						<div
							className="h-full rounded-full bg-primary shadow-[0_0_6px_rgba(197,198,207,0.4)]"
							style={{
								width: `${summary.totalDevicesCount > 0 ? (summary.onlineDevicesCount / summary.totalDevicesCount) * 100 : 0}%`,
							}}
						/>
					</div>
				</div>
			</div>

			<div className="rounded-xl border border-border-subtle/20 bg-surface-container p-4 flex flex-col justify-between gap-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-lg hover:shadow-black/30">
				<div className="flex items-center justify-between">
					<span className="min-w-0 flex-1 truncate text-xs font-medium tracking-wider text-muted-foreground uppercase">
						{t("metrics.averageTemperature")}
					</span>
					<Thermometer className="w-4 h-4 shrink-0 text-cool" />
				</div>
				<div className="flex items-baseline gap-1.5">
					<span className="text-2xl font-semibold text-foreground">
						{Math.round(summary.averageTemperatureCelsius)}°C
					</span>
					<span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-full">
						{summary.temperatureTrend > 0 ? "+" : ""}
						{summary.temperatureTrend}°C
					</span>
				</div>
			</div>

			<div className="rounded-xl border border-border-subtle/20 bg-surface-container p-4 flex flex-col justify-between gap-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-lg hover:shadow-black/30">
				<div className="flex items-center justify-between">
					<span className="min-w-0 flex-1 truncate text-xs font-medium tracking-wider text-muted-foreground uppercase">
						{t("metrics.securityAlerts")}
					</span>
					<ShieldAlert
						className={`w-4 h-4 shrink-0 ${summary.activeAlertsCount > 0 ? "text-alert-foreground" : "text-muted-foreground"}`}
					/>
				</div>
				<div>
					<span className="text-2xl font-semibold text-foreground">
						{summary.activeAlertsCount}
					</span>
					<span className="text-xs text-muted-foreground ml-1">
						{t("metrics.alertsUnit")}
					</span>
				</div>
			</div>
		</div>
	);
}
