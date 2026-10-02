import { useTranslation } from "react-i18next";
import {
	Bar,
	BarChart,
	LabelList,
	ResponsiveContainer,
	XAxis,
	YAxis,
} from "recharts";
import type { SceneMetrics } from "../../../types/scenes.types";
import { MetricCard, MetricEmpty } from "./MetricCard";

/** Altura de cada barra do ranking, rótulo incluído. */
const ROW_HEIGHT = 36;

interface TopScenesCardProps {
	scenes: SceneMetrics["topScenes"];
}

/**
 * Cenas mais ativadas: ranking em barras horizontais. A lista (visível só para leitor
 * de tela) carrega nomes e contagens, já que o gráfico é decorativo para quem não enxerga.
 */
export function TopScenesCard({ scenes }: TopScenesCardProps) {
	const { t } = useTranslation("scenes");
	const data = scenes.map((scene) => ({
		name: scene.name,
		count: scene.activations,
	}));

	return (
		<MetricCard title={t("metrics.topScenes")}>
			{scenes.length === 0 ? (
				<MetricEmpty className="h-24" />
			) : (
				<>
					<figure
						className="m-0 w-full"
						style={{ height: scenes.length * ROW_HEIGHT }}
						aria-label={t("metrics.topScenes")}
					>
						<div aria-hidden className="h-full w-full">
							<ResponsiveContainer width="100%" height="100%" debounce={200}>
								<BarChart
									data={data}
									layout="vertical"
									margin={{ top: 0, right: 28, left: 0, bottom: 0 }}
								>
									<XAxis type="number" hide domain={[0, "dataMax"]} />
									<YAxis
										type="category"
										dataKey="name"
										width={96}
										stroke="var(--color-foreground)"
										fontSize={12}
										tickLine={false}
										axisLine={false}
									/>
									<Bar
										dataKey="count"
										fill="var(--color-primary)"
										radius={4}
										barSize={10}
										isAnimationActive={false}
									>
										<LabelList
											dataKey="count"
											position="right"
											fill="var(--color-muted-foreground)"
											fontSize={11}
										/>
									</Bar>
								</BarChart>
							</ResponsiveContainer>
						</div>
					</figure>
					<ul aria-label={t("metrics.topScenes")} className="sr-only">
						{scenes.map((scene) => (
							<li key={scene.sceneId}>
								<span>{scene.name}</span>
								<span>
									{t("metrics.activationCount", { count: scene.activations })}
								</span>
							</li>
						))}
					</ul>
				</>
			)}
		</MetricCard>
	);
}
