import {
	Area,
	AreaChart,
	CartesianGrid,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";

const energyData = [
	{ time: "00:00", value: 4.2 },
	{ time: "04:00", value: 3.1 },
	{ time: "08:00", value: 8.5 },
	{ time: "12:00", value: 12.4 },
	{ time: "16:00", value: 10.2 },
	{ time: "20:00", value: 15.8 },
	{ time: "23:59", value: 6.4 },
];

export function EnergyChart() {
	return (
		<div className="lg:col-span-3 border border-zinc-800/80 rounded-2xl bg-zinc-900/50 backdrop-blur-sm p-6 flex flex-col">
			<h3 className="text-sm font-medium text-zinc-50 mb-6">
				Consumo de Energia (kW)
			</h3>
			<div className="flex-1 min-h-62.5 w-full">
				<ResponsiveContainer width="100%" height="100%">
					<AreaChart
						data={energyData}
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
						/>
					</AreaChart>
				</ResponsiveContainer>
			</div>
		</div>
	);
}
