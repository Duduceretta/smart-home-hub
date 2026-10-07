import { useTranslation } from "react-i18next";
import {
	PolarAngleAxis,
	RadialBar,
	RadialBarChart,
	ResponsiveContainer,
} from "recharts";
import { formatLastActivation } from "../../../lib/format-last-activation";
import type { SceneLastProblem } from "../../../types/scenes.types";
import { MetricCard, MetricEmpty } from "./MetricCard";

interface SuccessRateCardProps {
	/** Porcentagem 0-100; `null` quando não há ativações. */
	rate: number | null;
	/** Última ativação com alerta, mostrada embaixo do anel quando existe. */
	lastProblem?: SceneLastProblem | null;
	now?: number;
}

/** Taxa de sucesso como um anel (gauge): ativações sem falha nem dispositivo offline. */
export function SuccessRateCard({
	rate,
	lastProblem = null,
	now,
}: SuccessRateCardProps) {
	const { t, i18n } = useTranslation("scenes");
	const problemWhen = lastProblem
		? formatLastActivation(lastProblem.timestamp, i18n.language, now)
		: null;

	return (
		<MetricCard title={t("metrics.successRate")}>
			{rate === null ? (
				<MetricEmpty className="h-28" />
			) : (
				<div className="flex h-28 flex-col gap-1">
					<figure
						aria-label={t("metrics.successChart", { value: rate })}
						className="relative m-0 flex min-h-0 w-full flex-1 items-center justify-center"
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
									<PolarAngleAxis
										type="number"
										domain={[0, 100]}
										tick={false}
									/>
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
					<p className="m-0 h-4 shrink-0 truncate text-xs leading-4 text-muted-foreground">
						{lastProblem && problemWhen
							? t("metrics.lastProblem", {
									scene:
										lastProblem.sceneName ??
										t("metrics.lastProblemUnknownScene"),
									when: problemWhen,
								})
							: null}
					</p>
				</div>
			)}
		</MetricCard>
	);
}
