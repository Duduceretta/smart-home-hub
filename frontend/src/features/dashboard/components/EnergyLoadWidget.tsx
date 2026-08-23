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

export function EnergyLoadWidget() {
	const { t, i18n } = useTranslation("dashboard");
	const { data, isLoading } = useDashboardOverview();

	if (isLoading || !data) {
		return (
			<div className="rounded-xl border border-[#46464b]/20 bg-[#201f20] p-5 flex flex-col animate-pulse">
				<div className="h-4 w-48 bg-[#2a2a2a] rounded-md mb-6" />
				<div className="flex-1 min-h-62.5 w-full bg-[#2a2a2a]/40 rounded-xl" />
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
		<div className="rounded-xl border border-[#46464b]/20 bg-[#201f20] p-5 flex flex-col transition-all duration-200 hover:border-[#c5c6cf]/25 hover:shadow-lg hover:shadow-black/30">
			<div className="flex items-center justify-between mb-6">
				<div className="flex items-center gap-2">
					<div className="w-1.5 h-5 bg-[#c5c6cf] rounded-full" />
					<h3 className="text-sm font-medium text-[#e5e2e2]">
						{t("energyChart.title")}
					</h3>
				</div>
				<span className="text-[10px] font-semibold tracking-wider text-[#c5c6cf] bg-[#c5c6cf]/10 px-2.5 py-1 rounded-md border border-[#c5c6cf]/20">
					{data.summary.energyConsumptionKwh.toFixed(1)} kWh
				</span>
			</div>

			<div
				className={`w-full flex flex-col justify-center ${chartData.length === 0 ? "h-32" : "h-62.5"}`}
			>
				{chartData.length === 0 ? (
					<div className="flex flex-col items-center justify-center gap-1.5 py-4 text-center">
						<div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#2a2a2a] text-[#c7c6cb]">
							<Activity className="h-4 w-4" />
						</div>
						<p className="text-sm font-medium text-[#e5e2e2]">
							{t("energyChart.emptyTitle")}
						</p>
						<p className="max-w-xs text-xs text-[#c7c6cb]">
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
									<stop offset="5%" stopColor="#c5c6cf" stopOpacity={0.3} />
									<stop offset="95%" stopColor="#c5c6cf" stopOpacity={0} />
								</linearGradient>
							</defs>
							<CartesianGrid
								strokeDasharray="3 3"
								stroke="#46464b"
								strokeOpacity={0.2}
								vertical={false}
							/>
							<XAxis
								dataKey="time"
								stroke="#c7c6cb"
								fontSize={12}
								tickLine={false}
								axisLine={false}
							/>
							<YAxis
								stroke="#c7c6cb"
								fontSize={12}
								tickLine={false}
								axisLine={false}
							/>
							<Tooltip
								contentStyle={{
									backgroundColor: "#2a2a2a",
									borderColor: "rgba(70,70,75,0.3)",
									borderRadius: "8px",
									color: "#e5e2e2",
								}}
								itemStyle={{ color: "#c5c6cf" }}
							/>
							<Area
								type="monotone"
								dataKey="value"
								stroke="#c5c6cf"
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
