import { LayoutGrid } from "lucide-react";
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
import { useDashboardOverview } from "../hooks/useDashboardOverview";

const COLORS = ["#6366f1", "#a855f7", "#ec4899"];

export function RoomChart() {
	const { data, isLoading } = useDashboardOverview();

	if (isLoading || !data) {
		return (
			<div className="border border-zinc-800/80 rounded-2xl bg-zinc-900/50 backdrop-blur-sm p-5 flex-1 flex flex-col animate-pulse">
				<div className="h-4 w-28 bg-zinc-800 rounded-md mb-4" />
				<div className="flex-1 min-h-30 w-full bg-zinc-900/30 rounded-xl border border-zinc-800/40" />
			</div>
		);
	}

	return (
		<div className="border border-zinc-800/80 rounded-2xl bg-zinc-900/50 backdrop-blur-sm p-5 flex-1 flex flex-col">
			<h3 className="text-sm font-medium text-zinc-50 mb-4">Uso por Cômodo</h3>

			<div className="flex-1 min-h-30 w-full flex flex-col justify-center">
				{/* ZERO DATA STATE */}
				{data.roomUsage.length === 0 ? (
					<div className="flex flex-col items-center justify-center gap-1.5 py-6 text-center">
						<LayoutGrid className="h-6 w-6 text-zinc-600 mb-1" />
						<p className="text-xs font-medium text-zinc-400">
							Sem dados por cômodo
						</p>
						<p className="text-[11px] text-zinc-600">
							Aloque dispositivos em cômodos para medir.
						</p>
					</div>
				) : (
					<ResponsiveContainer width="100%" height="100%">
						<BarChart
							data={data.roomUsage}
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
								isAnimationActive={false}
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
				)}
			</div>
		</div>
	);
}
