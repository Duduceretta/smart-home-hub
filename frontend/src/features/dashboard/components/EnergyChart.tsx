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

export function EnergyChart() {
	const { t, i18n } = useTranslation("dashboard");
	const { data, isLoading } = useDashboardOverview();

	if (isLoading || !data) {
		return (
			<div className="lg:col-span-3 border border-zinc-800/80 rounded-2xl bg-zinc-900/50 backdrop-blur-sm p-6 flex flex-col animate-pulse">
				<div className="h-4 w-48 bg-zinc-800 rounded-md mb-6" />
				<div className="flex-1 min-h-62.5 w-full bg-zinc-900/30 rounded-xl border border-zinc-800/40" />
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
		};
	});

	return (
		<div className="lg:col-span-3 border border-zinc-800/80 rounded-2xl bg-zinc-900/50 backdrop-blur-sm p-6 flex flex-col">
			<h3 className="text-sm font-medium text-zinc-50 mb-6">
				{t("energyChart.title")}
			</h3>

			<div className="flex-1 min-h-62.5 w-full flex flex-col justify-center">
				{/* ZERO DATA STATE: Se não houver pontos no histórico */}
				{chartData.length === 0 ? (
					<div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
						<div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800/50 text-zinc-500">
							<Activity className="h-6 w-6" />
						</div>
						<p className="text-sm font-medium text-zinc-300">
							{t("energyChart.emptyTitle")}
						</p>
						<p className="max-w-xs text-xs text-zinc-500">
							{t("energyChart.emptySubtitle")}
						</p>
					</div>
				) : (
					<ResponsiveContainer width="100%" height="100%">
						<AreaChart
							data={chartData}
							margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
						>
							<defs>
								<linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
									<stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
									<stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
								</linearGradient>
							</defs>
							<CartesianGrid
								strokeDasharray="3 3"
								stroke="#27272a"
								vertical={false}
							/>
							<XAxis
								dataKey="time"
								stroke="#71717a"
								fontSize={12}
								tickLine={false}
								axisLine={false}
							/>
							<YAxis
								stroke="#71717a"
								fontSize={12}
								tickLine={false}
								axisLine={false}
							/>
							<Tooltip
								contentStyle={{
									backgroundColor: "#18181b",
									borderColor: "#27272a",
									borderRadius: "8px",
									color: "#f4f4f5",
								}}
								itemStyle={{ color: "#818cf8" }}
							/>
							<Area
								type="monotone"
								dataKey="value"
								stroke="#6366f1"
								strokeWidth={3}
								fillOpacity={1}
								fill="url(#colorValue)"
								isAnimationActive={false}
							/>
						</AreaChart>
					</ResponsiveContainer>
				)}
			</div>
		</div>
	);
}
