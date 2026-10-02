import { useTranslation } from "react-i18next";
import {
	PolarAngleAxis,
	RadialBar,
	RadialBarChart,
	ResponsiveContainer,
} from "recharts";
import { MetricCard, MetricEmpty } from "./MetricCard";

interface SuccessRateCardProps {
	/** Porcentagem 0-100; `null` quando não há ativações. */
	rate: number | null;
}

/** Taxa de sucesso como um anel (gauge): ativações sem falha nem dispositivo offline. */
export function SuccessRateCard({ rate }: SuccessRateCardProps) {
	const { t } = useTranslation("scenes");

	return (
		<MetricCard title={t("metrics.successRate")}>
			{rate === null ? (
				<MetricEmpty className="h-28" />
			) : (
				<figure
					aria-label={t("metrics.successChart", { value: rate })}
					className="relative m-0 flex h-28 w-full items-center justify-center"
				>
					<div aria-hidden className="absolute inset-0">
						<ResponsiveContainer width="100%" height="100%" debounce={200}>
							<RadialBarChart
								data={[{ name: "rate", value: rate }]}
								innerRadius="72%"
								outerRadius="100%"
								startAngle={90}
								endAngle={-270}
							>
								<PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
								<RadialBar
									dataKey="value"
									cornerRadius={8}
									fill="var(--color-primary)"
									background={{ fill: "var(--color-surface-high)" }}
									isAnimationActive={false}
								/>
							</RadialBarChart>
						</ResponsiveContainer>
					</div>
					<span className="relative text-xl font-semibold tabular-nums text-foreground">
						{rate}%
					</span>
				</figure>
			)}
		</MetricCard>
	);
}
