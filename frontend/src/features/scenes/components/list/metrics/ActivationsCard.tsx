import { useTranslation } from "react-i18next";
import {
	Bar,
	BarChart,
	Cell,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { lastDaysLabels } from "../../../lib/metrics-labels";
import { CHART_TOOLTIP_STYLE, MetricCard, MetricEmpty } from "./MetricCard";

interface ActivationsCardProps {
	perDay: number[];
	total: number;
	hasData: boolean;
	now?: number;
}

/** Ativações dos últimos 7 dias: o total em destaque e uma barra por dia (hoje em destaque). */
export function ActivationsCard({
	perDay,
	total,
	hasData,
	now,
}: ActivationsCardProps) {
	const { t, i18n } = useTranslation("scenes");
	const labels = lastDaysLabels(perDay.length, i18n.language, now);
	const data = perDay.map((count, index) => ({ day: labels[index], count }));

	return (
		<MetricCard title={t("metrics.activations")} hint={t("metrics.period")}>
			{hasData ? (
				<>
					<div className="flex items-baseline gap-2">
						<span className="text-3xl font-semibold tabular-nums text-foreground">
							{total}
						</span>
						<span className="text-xs text-muted-foreground">
							{t("metrics.activationsUnit")}
						</span>
					</div>
					<figure
						aria-label={t("metrics.activationsChart", {
							values: perDay.join(", "),
						})}
						className="m-0 h-32 w-full"
					>
						<div aria-hidden className="h-full w-full">
							<ResponsiveContainer width="100%" height="100%" debounce={200}>
								<BarChart
									data={data}
									margin={{ top: 4, right: 0, left: 0, bottom: 0 }}
								>
									<XAxis
										dataKey="day"
										stroke="var(--color-muted-foreground)"
										fontSize={11}
										tickLine={false}
										axisLine={false}
										tickMargin={8}
									/>
									<YAxis hide allowDecimals={false} domain={[0, "dataMax"]} />
									<Tooltip
										cursor={{ fill: "var(--color-surface-high)", opacity: 0.5 }}
										contentStyle={CHART_TOOLTIP_STYLE}
										itemStyle={{ color: "var(--color-primary)" }}
										formatter={(value) => [value, t("metrics.activations")]}
									/>
									<Bar
										dataKey="count"
										radius={[4, 4, 0, 0]}
										isAnimationActive={false}
									>
										{data.map((entry, index) => (
											<Cell
												// biome-ignore lint/suspicious/noArrayIndexKey: o rótulo do dia pode repetir em fusos raros; a posição identifica a barra
												key={`${entry.day}-${index}`}
												fill={
													index === data.length - 1
														? "var(--color-primary)"
														: "var(--color-muted-foreground)"
												}
												fillOpacity={index === data.length - 1 ? 1 : 0.45}
											/>
										))}
									</Bar>
								</BarChart>
							</ResponsiveContainer>
						</div>
					</figure>
				</>
			) : (
				<MetricEmpty className="h-32" />
			)}
		</MetricCard>
	);
}
