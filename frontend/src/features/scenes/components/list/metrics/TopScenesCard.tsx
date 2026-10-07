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

/** Altura de cada barra do ranking, rótulo incluído: 3 barras ocupam o h-24 do corpo, igual ao estado vazio. */
const ROW_HEIGHT = 32;

/** Largura reservada aos nomes à esquerda das barras. */
const LABEL_WIDTH = 96;
const MAX_LABEL_CHARS = 14;

interface LeftAlignedTickProps {
	y?: number;
	payload?: { value: string };
}

/**
  * Nome da cena alinhado à esquerda (o eixo do Recharts alinha à direita). A área de rótulos
 * começa em x=0 do gráfico (sem margem à esquerda), então o texto parte dali.

 * Nome longo é cortado com reticências; o nome inteiro fica no `<title>`.
 */
function LeftAlignedTick({ y = 0, payload }: LeftAlignedTickProps) {
	const full = payload?.value ?? "";
	const label =
		full.length > MAX_LABEL_CHARS
			? `${full.slice(0, MAX_LABEL_CHARS - 1)}…`
			: full;

	return (
		<text
			x={0}
			y={y}
			textAnchor="start"
			dominantBaseline="central"
			fill="var(--color-foreground)"
			fontSize={12}
		>
			<title>{full}</title>
			{label}
		</text>
	);
}

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
		<MetricCard title={t("metrics.topScenes")} className="flex-1">
			{scenes.length === 0 ? (
				<MetricEmpty className="min-h-24 flex-1" />
			) : (
				<div className="min-h-24 flex-1">
					<figure
						className="m-0 h-full w-full"
						style={{ minHeight: scenes.length * ROW_HEIGHT }}
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
										width={LABEL_WIDTH}
										tick={<LeftAlignedTick />}
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
				</div>
			)}
		</MetricCard>
	);
}
