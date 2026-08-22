import { ShieldAlert, Thermometer, Wifi, Zap } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useDashboardOverview } from "../hooks/useDashboardOverview";

export function StatusHubSummary() {
	const { t } = useTranslation("dashboard");
	const { data, isLoading } = useDashboardOverview();

	if (isLoading || !data) {
		return (
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
				{["energy", "devices", "temperature", "alerts"].map((metricKey) => (
					<div
						key={`skeleton-${metricKey}`}
						className="h-24 rounded-xl border border-[#46464b]/20 bg-[#1c1b1c] p-4 flex flex-col justify-between"
					>
						<div className="h-3 w-20 bg-[#201f20] rounded-md" />
						<div className="h-6 w-16 bg-[#201f20] rounded-md" />
					</div>
				))}
			</div>
		);
	}

	const { summary } = data;

	return (
		<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
			<div className="rounded-xl border border-[#46464b]/20 bg-[#1c1b1c] p-4 flex flex-col justify-between gap-3">
				<div className="flex items-center justify-between">
					<span className="text-[10px] font-semibold tracking-wider text-[#c7c6cb] uppercase">
						{t("metrics.energyConsumption")}
					</span>
					<Zap className="w-4 h-4 text-[#d3c4b8]" />
				</div>
				<div>
					<span className="text-2xl font-bold text-[#e5e2e2]">
						{summary.energyConsumptionKwh.toFixed(1)}
					</span>
					<span className="text-xs text-[#c7c6cb] ml-1">kWh</span>
				</div>
			</div>

			<div className="rounded-xl border border-[#46464b]/20 bg-[#1c1b1c] p-4 flex flex-col justify-between gap-3">
				<div className="flex items-center justify-between">
					<span className="text-[10px] font-semibold tracking-wider text-[#c7c6cb] uppercase">
						{t("metrics.onlineDevices")}
					</span>
					<Wifi className="w-4 h-4 text-[#c5c6cf]" />
				</div>
				<div>
					<span className="text-2xl font-bold text-[#e5e2e2]">
						{summary.onlineDevicesCount}
					</span>
					<span className="text-xs text-[#c7c6cb] ml-1">
						{t("metrics.activeOf", { total: summary.totalDevicesCount })}
					</span>
				</div>
			</div>

			<div className="rounded-xl border border-[#46464b]/20 bg-[#1c1b1c] p-4 flex flex-col justify-between gap-3">
				<div className="flex items-center justify-between">
					<span className="text-[10px] font-semibold tracking-wider text-[#c7c6cb] uppercase">
						{t("metrics.averageTemperature")}
					</span>
					<Thermometer className="w-4 h-4 text-[#c4c6d2]" />
				</div>
				<div className="flex items-baseline gap-1.5">
					<span className="text-2xl font-bold text-[#e5e2e2]">
						{Math.round(summary.averageTemperatureCelsius)}°C
					</span>
					<span className="text-[10px] font-semibold text-[#c5c6cf] bg-[#c5c6cf]/10 px-1.5 py-0.5 rounded-full">
						{summary.temperatureTrend > 0 ? "+" : ""}
						{summary.temperatureTrend}°C
					</span>
				</div>
			</div>

			<div className="rounded-xl border border-[#46464b]/20 bg-[#1c1b1c] p-4 flex flex-col justify-between gap-3">
				<div className="flex items-center justify-between">
					<span className="text-[10px] font-semibold tracking-wider text-[#c7c6cb] uppercase">
						{t("metrics.securityAlerts")}
					</span>
					<ShieldAlert
						className={`w-4 h-4 ${summary.activeAlertsCount > 0 ? "text-[#ffb4ab]" : "text-[#c7c6cb]"}`}
					/>
				</div>
				<div>
					<span className="text-2xl font-bold text-[#e5e2e2]">
						{summary.activeAlertsCount}
					</span>
					<span className="text-xs text-[#c7c6cb] ml-1">
						{t("metrics.alertsUnit")}
					</span>
				</div>
			</div>
		</div>
	);
}
