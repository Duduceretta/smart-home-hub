import { Activity, Calendar } from "lucide-react";
import { useState } from "react";
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
import { Button } from "@/core/components/ui/button";
import { useDeviceEnergy } from "../../hooks/useDeviceEnergy";
import {
	formatDeviceEnergy,
	formatDevicePower,
} from "../../lib/format-device-energy";
import type { DeviceEnergyRange } from "../../types/devices.types";

interface DeviceEnergyChartProps {
	deviceId: string;
}

const RANGES: DeviceEnergyRange[] = ["24h", "7d"];
const RANGE_LABEL_KEY: Record<DeviceEnergyRange, string> = {
	"24h": "energy.range24h",
	"7d": "energy.range7d",
};
const RANGE_LABEL_FALLBACK: Record<DeviceEnergyRange, string> = {
	"24h": "24h",
	"7d": "7 dias",
};

/**
 * Consumo de energia do dispositivo — `GET /devices/{id}/energy`. Cópia
 * adaptada de `rooms/components/detail/RoomEnergyChart.tsx` (isolamento do
 * FSD), trocando o escopo de "ambiente" pra "dispositivo".
 */
export function DeviceEnergyChart({ deviceId }: DeviceEnergyChartProps) {
	const { t } = useTranslation("devices");
	const [range, setRange] = useState<DeviceEnergyRange>("24h");
	const { data, isLoading, isError, refetch } = useDeviceEnergy(
		deviceId,
		range,
	);

	const chartData = (data?.chart ?? []).map((point) => {
		const date = new Date(point.timestamp);
		return {
			time:
				range === "24h"
					? date.toLocaleTimeString("pt-BR", {
							hour: "2-digit",
							minute: "2-digit",
						})
					: date.toLocaleDateString("pt-BR", {
							month: "short",
							day: "numeric",
						}),
			value: point.value,
			isEstimated: point.isEstimated,
		};
	});

	const MAX_VISIBLE_TICKS = 8;
	const xAxisTickInterval =
		chartData.length > MAX_VISIBLE_TICKS
			? Math.ceil(chartData.length / MAX_VISIBLE_TICKS)
			: 0;

	const totalEnergy = formatDeviceEnergy(data?.totalConsumptionKwh ?? 0);

	return (
		<div className="flex flex-col gap-3 rounded-lg border border-border-subtle bg-surface-container p-4">
			<div className="flex items-center justify-between">
				<h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
					{t("energy.title", "Consumo de Energia")}
				</h3>
				<div className="flex items-center gap-1">
					<Calendar className="mr-1 h-3 w-3 text-muted-foreground" />
					{RANGES.map((r) => (
						<button
							key={r}
							type="button"
							onClick={() => setRange(r)}
							className={`cursor-pointer rounded px-2 py-0.5 text-xs font-medium transition-colors ${
								range === r
									? "bg-primary text-primary-foreground font-semibold shadow-xs"
									: "text-muted-foreground hover:bg-surface-high hover:text-foreground"
							}`}
						>
							{t(RANGE_LABEL_KEY[r], RANGE_LABEL_FALLBACK[r])}
						</button>
					))}
				</div>
			</div>

			{isLoading ? (
				<div className="h-40 w-full animate-pulse rounded-lg bg-surface-high/60" />
			) : isError ? (
				<div className="flex items-center justify-between rounded-lg border border-dashed border-border-subtle p-3 text-xs text-muted-foreground">
					<span>
						{t(
							"energy.errorLoad",
							"Não foi possível carregar o consumo de energia.",
						)}
					</span>
					<Button variant="ghost" size="xs" onClick={() => refetch()}>
						{t("energy.retry", "Tentar de novo")}
					</Button>
				</div>
			) : !data?.hasEnergyData ? (
				<div className="flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border-subtle bg-surface-low/30 py-6 text-center">
					<Activity className="h-4 w-4 text-muted-foreground" />
					<p className="text-xs text-muted-foreground">
						{t("energy.noData", "Nenhum consumo registrado neste período.")}
					</p>
				</div>
			) : (
				<>
					<span className="w-fit rounded-md border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium tracking-wider text-primary">
						{data.isEnergyEstimated && "~"}
						{t(
							"energy.periodTotal",
							`${totalEnergy.value} ${totalEnergy.unit} no período`,
							{ value: totalEnergy.value, unit: totalEnergy.unit },
						)}
					</span>

					<div className="h-40 w-full">
						<ResponsiveContainer width="100%" height="100%">
							<AreaChart
								data={chartData}
								margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
							>
								<defs>
									<linearGradient
										id="deviceEnergyColor"
										x1="0"
										y1="0"
										x2="0"
										y2="1"
									>
										<stop
											offset="0%"
											stopColor="var(--color-primary)"
											stopOpacity={0.25}
										/>
										<stop
											offset="100%"
											stopColor="var(--color-primary)"
											stopOpacity={0.0}
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
								/>
								<YAxis
									stroke="var(--color-muted-foreground)"
									fontSize={11}
									tickLine={false}
									axisLine={false}
									tickMargin={6}
									width={44}
									tickFormatter={(kw: number) => {
										const power = formatDevicePower(kw);
										return `${power.value}${power.unit}`;
									}}
								/>
								<Tooltip
									cursor={{
										stroke: "var(--color-border)",
										strokeWidth: 1,
										strokeDasharray: "3 3",
									}}
									contentStyle={{
										backgroundColor: "var(--color-popover)",
										borderColor: "var(--color-border-subtle)",
										borderRadius: "8px",
										color: "var(--color-foreground)",
										boxShadow: "0 4px 12px rgba(0, 0, 0, 0.2)",
									}}
									itemStyle={{ color: "var(--color-primary)" }}
									formatter={(rawValue, _name, props) => {
										const power = formatDevicePower(Number(rawValue));
										const isEstimated = Boolean(
											(props?.payload as { isEstimated?: boolean } | undefined)
												?.isEstimated,
										);
										return [
											`${isEstimated ? "~" : ""}${power.value} ${power.unit}${isEstimated ? t("energy.estimatedSuffix", " (estimado)") : ""}`,
											t("energy.tooltipConsumption", "Consumo"),
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
									fill="url(#deviceEnergyColor)"
									activeDot={{
										r: 4,
										stroke: "var(--color-background)",
										strokeWidth: 2,
									}}
									isAnimationActive={false}
								/>
							</AreaChart>
						</ResponsiveContainer>
					</div>
				</>
			)}
		</div>
	);
}
