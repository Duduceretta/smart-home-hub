import { Activity } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
	Area,
	AreaChart,
	CartesianGrid,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { useDashboardOverview } from "../hooks/useDashboardOverview";
import { formatEnergy, formatPower } from "../lib/formatEnergy";
import { DashboardErrorState } from "./DashboardErrorState";

export function EnergyLoadWidget() {
	const { t, i18n } = useTranslation("dashboard");
	const { data, isLoading, isError, refetch } = useDashboardOverview();

	if (isLoading) {
		return (
			<div className="rounded-xl border border-border-subtle/20 bg-surface-high p-4 flex flex-col animate-pulse">
				<div className="h-4 w-48 bg-surface-high rounded-md mb-6" />
				<div className="flex-1 min-h-62.5 w-full bg-surface-high/40 rounded-xl" />
			</div>
		);
	}

	if (isError || !data) {
		return (
			<div className="rounded-xl border border-border-subtle/10 bg-surface-high p-4 flex flex-col justify-center h-62.5">
				<DashboardErrorState
					title={t(
						"energyChart.errorTitle",
						"Não foi possível carregar o gráfico de consumo",
					)}
					subtitle={t(
						"energyChart.errorSubtitle",
						"Verifique sua conexão e tente novamente.",
					)}
					onRetry={() => refetch()}
				/>
			</div>
		);
	}

	const chartData = data.energyChart.map((point) => {
		const date = new Date(point.timestamp);
		return {
			time: date.toLocaleTimeString(i18n.language || "pt-BR", {
				hour: "2-digit",
				minute: "2-digit",
			}),
			value: point.value,
			isEstimated: point.isEstimated,
		};
	});

	const totalEnergy = formatEnergy(data.summary.energyConsumptionKwh);

	// Recharts mostra 1 label por ponto por padrão — com o backend agora
	// preenchendo todo balde de 5min (mesmo sem telemetria), um dia inteiro
	// vira ~288 pontos e os labels colidem/ficam ilegíveis. Calcula um
	// intervalo fixo pra sempre mostrar ~8 labels, não importa quantos
	// pontos existam — mantém o espaçamento visual do eixo previsível.
	const MAX_VISIBLE_TICKS = 8;
	const xAxisTickInterval =
		chartData.length > MAX_VISIBLE_TICKS
			? Math.ceil(chartData.length / MAX_VISIBLE_TICKS)
			: 0;

	return (
		<div className="rounded-xl border border-border-subtle/10 bg-surface-high p-4 flex flex-col transition-all duration-200 hover:border-primary/25 hover:shadow-lg hover:shadow-black/30">
			<div className="flex items-center justify-between mb-6">
				<div className="flex flex-col gap-1">
					<div className="flex items-center gap-2">
						<div className="w-1.5 h-5 bg-primary rounded-full" />
						<h3 className="text-sm font-medium text-foreground">
							{t("energyChart.title", "Potência ao vivo")}
						</h3>
					</div>
					<span className="text-xs text-muted-foreground/60 pl-3.5">
						{t("energyChart.subtitle", "Quanto a casa está puxando agora")}
					</span>
				</div>
				<div className="flex flex-col items-end gap-1">
					<span
						className="text-xs font-medium tracking-wider text-primary bg-primary/10 px-3 py-1 rounded-md border border-primary/20"
						title={
							data.summary.isEnergyEstimated
								? t(
										"metrics.energyEstimatedTitle",
										"Inclui consumo estimado de dispositivos sem sensor de energia (ex: TV)",
									)
								: undefined
						}
					>
						{data.summary.isEnergyEstimated && "~"}
						{totalEnergy.value} {totalEnergy.unit}
					</span>
					<span className="text-xs text-muted-foreground/60">
						{t("energyChart.totalSubtitle", "Acumulado hoje")}
					</span>
				</div>
			</div>

			<div
				className={`w-full flex flex-col justify-center ${chartData.length === 0 ? "h-32" : "h-62.5"}`}
			>
				{chartData.length === 0 ? (
					<div className="flex flex-col items-center justify-center gap-1 py-4 text-center">
						<div className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-high text-muted-foreground">
							<Activity className="h-4 w-4" />
						</div>
						<p className="text-sm font-medium text-foreground">
							{t("energyChart.emptyTitle")}
						</p>
						<p className="max-w-xs text-xs text-muted-foreground">
							{t("energyChart.emptySubtitle")}
						</p>
					</div>
				) : (
					<ResponsiveContainer width="100%" height="100%">
						<AreaChart
							data={chartData}
							margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
						>
							<defs>
								<linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
									<stop
										offset="0%"
										stopColor="var(--color-primary)"
										stopOpacity={0.18}
									/>
									<stop
										offset="60%"
										stopColor="var(--color-primary)"
										stopOpacity={0.04}
									/>
									<stop
										offset="100%"
										stopColor="var(--color-primary)"
										stopOpacity={0}
									/>
								</linearGradient>
							</defs>
							<CartesianGrid
								strokeDasharray="3 6"
								stroke="var(--color-border-subtle)"
								strokeOpacity={0.15}
								vertical={false}
							/>
							<XAxis
								dataKey="time"
								stroke="var(--color-muted-foreground)"
								fontSize={11}
								tickLine={false}
								axisLine={false}
								tickMargin={10}
								interval={xAxisTickInterval}
								padding={{ left: 12, right: 12 }}
							/>
							<YAxis
								stroke="var(--color-muted-foreground)"
								fontSize={11}
								tickLine={false}
								axisLine={false}
								tickMargin={6}
								width={48}
								tickFormatter={(kw: number) => {
									const power = formatPower(kw);
									return `${power.value}${power.unit}`;
								}}
							/>
							<Tooltip
								cursor={{
									stroke: "var(--color-border-subtle)",
									strokeWidth: 1,
									strokeDasharray: "3 3",
								}}
								contentStyle={{
									backgroundColor: "var(--color-surface-high)",
									borderColor: "var(--color-border-subtle)",
									borderRadius: "8px",
									color: "var(--color-foreground)",
								}}
								itemStyle={{ color: "var(--color-primary)" }}
								formatter={(rawValue, _name, props) => {
									const power = formatPower(Number(rawValue));
									const isEstimated = Boolean(
										(props?.payload as { isEstimated?: boolean } | undefined)
											?.isEstimated,
									);
									return [
										`${isEstimated ? "~" : ""}${power.value} ${power.unit}${isEstimated ? ` (${t("energyChart.estimated", "estimado")})` : ""}`,
										t("energyChart.title", "Potência ao vivo"),
									];
								}}
							/>
							<Area
								type="monotone"
								dataKey="value"
								stroke="var(--color-primary)"
								strokeWidth={2}
								strokeLinecap="round"
								strokeLinejoin="round"
								fillOpacity={1}
								fill="url(#colorValue)"
								activeDot={{
									r: 4,
									stroke: "var(--color-surface-container)",
									strokeWidth: 2,
								}}
								isAnimationActive={false}
							/>
						</AreaChart>
					</ResponsiveContainer>
				)}
			</div>
		</div>
	);
}
