import {
	Bar,
	BarChart,
	Rectangle,
	type RectangleProps,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";

const roomData = [
	{ name: "Sala", value: 45 },
	{ name: "Cozinha", value: 30 },
	{ name: "Quartos", value: 25 },
];

const COLORS = ["#6366f1", "#a855f7", "#ec4899"]; // Indigo, Purple, Pink

export function RoomChart() {
	return (
		<div className="border border-zinc-800/80 rounded-2xl bg-zinc-900/50 backdrop-blur-sm p-5 flex-1 flex flex-col">
			<h3 className="text-sm font-medium text-zinc-50 mb-4">Uso por Cômodo</h3>
			<div className="flex-1 min-h-30 w-full">
				<ResponsiveContainer width="100%" height="100%">
					<BarChart
						data={roomData}
						layout="vertical"
						margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
					>
						<XAxis type="number" hide />
						<YAxis
							dataKey="name"
							type="category"
							axisLine={false}
							tickLine={false}
							stroke="#a1a1aa"
							fontSize={12}
							width={60}
						/>
						<Tooltip
							cursor={{ fill: "#27272a" }}
							contentStyle={{
								backgroundColor: "#18181b",
								borderColor: "#27272a",
								borderRadius: "8px",
							}}
						/>
						<Bar
							dataKey="value"
							barSize={12}
							shape={(props: RectangleProps & { index: number }) => {
								const { index, ...rest } = props;
								return (
									<Rectangle
										{...rest}
										radius={[0, 4, 4, 0]}
										fill={COLORS[index % COLORS.length]}
									/>
								);
							}}
						/>
					</BarChart>
				</ResponsiveContainer>
			</div>
		</div>
	);
}
