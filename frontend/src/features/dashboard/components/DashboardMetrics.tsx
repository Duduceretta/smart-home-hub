import { ShieldAlert, Thermometer, Zap } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useDashboardOverview } from "../hooks/useDashboardOverview";

export function DashboardMetrics() {
	const { t } = useTranslation("dashboard");
	const { data, isLoading } = useDashboardOverview();

	// 1. Estado de Carregamento (Skeleton isolado respeitando exatamente o seu grid)
	if (isLoading || !data) {
		return (
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse">
				{/* Usamos um array de strings estáticas como chaves para satisfazer o Biome sem precisar do index */}
				{["energy", "devices", "temperature", "alerts"].map((metricKey) => (
					<div
						key={`skeleton-${metricKey}`}
						className="h-32 border border-zinc-800/80 rounded-2xl bg-zinc-900/30 p-6 flex flex-col justify-between"
					>
						<div className="flex justify-between items-start">
							<div className="h-4 w-28 bg-zinc-800 rounded-md" />
							<div className="h-5 w-5 bg-zinc-800 rounded-full" />
						</div>
						<div className="mt-4">
							<div className="h-8 w-16 bg-zinc-800 rounded-md" />
						</div>
					</div>
				))}
			</div>
		);
	}

	const summary = data.summary;

	// 2. Apresentação Pura (O seu JSX intacto, apenas consumindo as variáveis reais do C#)
	return (
		<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
			{/* Card 1: Consumo de Energia */}
			<div className="border border-zinc-800/80 rounded-2xl bg-zinc-900/50 backdrop-blur-sm p-6 flex flex-col justify-between relative overflow-hidden group">
				<div className="flex justify-between items-start relative z-10">
					<span className="text-sm font-medium text-zinc-400">
						{t("metrics.energyConsumption")}
					</span>
					<Zap className="w-5 h-5 text-emerald-400" />
				</div>
				<div className="mt-4 relative z-10">
					<span className="text-3xl font-bold text-zinc-50">
						{summary.energyConsumptionKwh.toFixed(1)}
					</span>
					<span className="text-sm text-zinc-400 ml-1">kWh</span>
				</div>
				<div className="absolute bottom-0 left-0 w-full h-1 bg-emerald-400/20">
					{/* A largura da barra visual agora pode ser proporcional ou fixa decorativa */}
					<div className="h-full bg-emerald-400 w-2/3" />
				</div>
			</div>

			{/* Card 2: Dispositivos Online */}
			<div className="border border-zinc-800/80 rounded-2xl bg-zinc-900/50 backdrop-blur-sm p-6 flex flex-col justify-between shadow-[0_0_20px_rgba(99,102,241,0.05)]">
				<div className="flex justify-between items-start">
					<span className="text-sm font-medium text-zinc-400">
						{t("metrics.onlineDevices")}
					</span>
					<div className="relative flex h-3 w-3 mt-1">
						<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
						<span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500" />
					</div>
				</div>
				<div className="mt-4">
					<span className="text-3xl font-bold text-zinc-50">
						{summary.onlineDevicesCount}
					</span>
					<span className="text-sm text-zinc-400 ml-1">
						{t("metrics.activeOf", { total: summary.totalDevicesCount })}
					</span>
				</div>
			</div>

			{/* Card 3: Temperatura Média */}
			<div className="border border-zinc-800/80 rounded-2xl bg-zinc-900/50 backdrop-blur-sm p-6 flex flex-col justify-between">
				<div className="flex justify-between items-start">
					<span className="text-sm font-medium text-zinc-400">
						{t("metrics.averageTemperature")}
					</span>
					<Thermometer className="w-5 h-5 text-orange-400" />
				</div>
				<div className="mt-4 flex items-end gap-2">
					<span className="text-3xl font-bold text-zinc-50">
						{Math.round(summary.averageTemperatureCelsius)}°C
					</span>
					<span className="text-xs font-medium text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded-full mb-1">
						{summary.temperatureTrend > 0
							? `+${summary.temperatureTrend}`
							: summary.temperatureTrend}
						°C
					</span>
				</div>
			</div>

			{/* Card 4: Alertas de Segurança */}
			<div className="border border-zinc-800/80 rounded-2xl bg-zinc-900/50 backdrop-blur-sm p-6 flex flex-col justify-between">
				<div className="flex justify-between items-start">
					<span className="text-sm font-medium text-zinc-400">
						{t("metrics.securityAlerts")}
					</span>
					<ShieldAlert className="w-5 h-5 text-zinc-500" />
				</div>
				<div className="mt-4">
					<span className="text-3xl font-bold text-zinc-50">
						{summary.activeAlertsCount}
					</span>
					<span className="text-sm text-zinc-400 ml-1">
						{t("metrics.alertsUnit")}
					</span>
				</div>
			</div>
		</div>
	);
}
