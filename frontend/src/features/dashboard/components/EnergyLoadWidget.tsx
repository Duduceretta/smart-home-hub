import { Activity } from "lucide-react";
import { useEffect, useState } from "react";
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

/** Abaixo de 640px (sm) o eixo X não cabe 8 rótulos "HH:MM" sem espremer —
 * reduz pra 4 ticks visíveis nesse recorte. */
function useIsNarrowViewport() {
	const [isNarrow, setIsNarrow] = useState(
		() => typeof window !== "undefined" && window.innerWidth < 640,
	);

	useEffect(() => {
		const mql = window.matchMedia("(max-width: 639px)");
		const handleChange = () => setIsNarrow(mql.matches);
		handleChange();
		mql.addEventListener("change", handleChange);
		return () => mql.removeEventListener("change", handleChange);
	}, []);

	return isNarrow;
}

export function EnergyLoadWidget() {
	const { t, i18n } = useTranslation("dashboard");
	const { data, isLoading, isError, refetch } = useDashboardOverview();
	const isNarrowViewport = useIsNarrowViewport();

	if (isLoading) {
		return (
			<div className="flex flex-col rounded-xl border border-border-subtle bg-surface-container p-4 animate-pulse">
				<div className="mb-6 h-4 w-48 rounded-md bg-surface-high" />
				<div className="min-h-62.5 w-full flex-1 rounded-xl bg-surface-low/50" />
			</div>
		);
	}

	if (isError || !data) {
		return (
			<div className="flex h-62.5 flex-col justify-center rounded-xl border border-border-subtle bg-surface-container p-4">
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

	const MAX_VISIBLE_TICKS = isNarrowViewport ? 4 : 8;
	const xAxisTickInterval =
		chartData.length > MAX_VISIBLE_TICKS
			? Math.ceil(chartData.length / MAX_VISIBLE_TICKS)
			: 0;

	return (
		<div className="flex flex-col rounded-xl border border-border-subtle bg-surface-container p-4 transition-all duration-200 hover:border-border">
			<div className="mb-6 flex items-center justify-between">
				<div className="flex flex-col gap-1">
					<div className="flex items-center gap-2">
						<div className="h-4 w-1.5 rounded-full bg-primary" />
						<h3 className="text-sm font-semibold tracking-tight text-foreground">
							{t("energyChart.title", "Potência ao vivo")}
						</h3>
					</div>
					<span className="pl-3.5 text-xs text-muted-foreground">
						{t("energyChart.subtitle", "Quanto a casa está puxando agora")}
					</span>
				</div>
				<div className="flex flex-col items-end gap-1">
					<span
						className="rounded-md border border-border-subtle bg-surface-low px-2.5 py-1 text-xs font-semibold tabular-nums text-foreground"
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
					<span className="text-[11px] text-muted-foreground">
						{t("energyChart.totalSubtitle", "Acumulado hoje")}
					</span>
				</div>
			</div>

			<div
				className={`flex w-full flex-col justify-center ${chartData.length === 0 ? "h-32" : "h-62.5"}`}
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
								strokeOpacity={0.4}
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
									backgroundColor: "var(--color-popover)",
									borderColor: "var(--color-border-subtle)",
									borderRadius: "8px",
									color: "var(--color-foreground)",
									boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
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
