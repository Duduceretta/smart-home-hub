import { useTranslation } from "react-i18next";
import type { SceneMetrics } from "../../types/scenes.types";

const BAR_WIDTH = 6;
const BAR_GAP = 4;
const CHART_HEIGHT = 24;
/** Altura das barras do gráfico vazio: só para marcar o lugar, sem sugerir dado. */
const EMPTY_BAR_HEIGHT = 4;

interface SceneMetricsPanelProps {
	/** `null` enquanto não há dados (ou o backend ainda não os fornece): mostra o estado vazio. */
	metrics: SceneMetrics | null;
}

function ActivationsChart({
	values,
	label,
	isEmpty,
}: {
	values: number[];
	label: string;
	isEmpty: boolean;
}) {
	const max = Math.max(1, ...values);
	const width = values.length * BAR_WIDTH + (values.length - 1) * BAR_GAP;

	return (
		<svg
			role="img"
			aria-label={label}
			viewBox={`0 0 ${width} ${CHART_HEIGHT}`}
			width={width}
			height={CHART_HEIGHT}
			className="shrink-0"
		>
			{values.map((value, index) => {
				const height = isEmpty
					? EMPTY_BAR_HEIGHT
					: Math.max(2, Math.round((value / max) * CHART_HEIGHT));
				const isLast = index === values.length - 1;

				return (
					<rect
						// biome-ignore lint/suspicious/noArrayIndexKey: barras são posições fixas dos 7 dias, não uma lista reordenável
						key={index}
						x={index * (BAR_WIDTH + BAR_GAP)}
						y={CHART_HEIGHT - height}
						width={BAR_WIDTH}
						height={height}
						rx={2}
						className={
							isLast && !isEmpty ? "fill-primary" : "fill-muted-foreground/40"
						}
					/>
				);
			})}
		</svg>
	);
}

/**
 * Painel de desempenho das cenas, na coluna lateral da tela: ativações dos últimos
 * 7 dias, taxa de sucesso, cenas mais ativadas e horário de pico. Sempre visível: sem
 * dados mostra cada métrica vazia ("—") com uma explicação, em vez de sumir ou exibir
 * zeros que pareceriam medição.
 */
export function SceneMetricsPanel({ metrics }: SceneMetricsPanelProps) {
	const { t } = useTranslation("scenes");
	const hasData = metrics !== null && metrics.activationsTotal > 0;
	const perDay =
		metrics?.activationsPerDay ?? Array.from({ length: 7 }, () => 0);

	return (
		<section
			aria-label={t("metrics.title")}
			className="rounded-xl border border-border-subtle bg-surface-container"
		>
			<header className="flex items-baseline justify-between gap-2 border-b border-border-subtle p-4">
				<h3 className="text-sm font-semibold text-foreground">
					{t("metrics.title")}
				</h3>
				<span className="text-xs text-muted-foreground">
					{t("metrics.period")}
				</span>
			</header>

			<div className="divide-y divide-border-subtle">
				<div className="flex items-center justify-between gap-4 p-4">
					<span className="text-sm text-muted-foreground">
						{t("metrics.activations")}
					</span>
					<span className="flex items-center gap-3">
						<ActivationsChart
							values={perDay}
							isEmpty={!hasData}
							label={t("metrics.activationsChart", {
								values: perDay.join(", "),
							})}
						/>
						<span className="text-lg font-semibold tabular-nums text-foreground">
							{hasData ? metrics.activationsTotal : "—"}
						</span>
					</span>
				</div>

				<div className="flex items-center justify-between gap-4 p-4">
					<span className="text-sm text-muted-foreground">
						{t("metrics.successRate")}
					</span>
					<span className="text-lg font-semibold tabular-nums text-foreground">
						{hasData && metrics.successRate !== null
							? `${metrics.successRate}%`
							: "—"}
					</span>
				</div>

				<div className="flex flex-col gap-2 p-4">
					<span className="text-sm text-muted-foreground">
						{t("metrics.topScenes")}
					</span>
					{hasData && metrics.topScenes.length > 0 ? (
						<ul
							aria-label={t("metrics.topScenes")}
							className="flex flex-col gap-1"
						>
							{metrics.topScenes.map((scene) => (
								<li
									key={scene.sceneId}
									className="flex items-center justify-between gap-2 text-sm"
								>
									<span className="min-w-0 truncate text-foreground">
										{scene.name}
									</span>
									<span className="shrink-0 text-xs tabular-nums text-muted-foreground">
										{t("metrics.activationCount", { count: scene.activations })}
									</span>
								</li>
							))}
						</ul>
					) : (
						<span className="text-lg font-semibold text-foreground">—</span>
					)}
				</div>

				<div className="flex items-center justify-between gap-4 p-4">
					<span className="text-sm text-muted-foreground">
						{t("metrics.peakHour")}
					</span>
					<span className="text-lg font-semibold tabular-nums text-foreground">
						{hasData && metrics.peakHour ? metrics.peakHour : "—"}
					</span>
				</div>
			</div>

			{!hasData && (
				<p className="border-t border-dashed border-border-subtle p-4 text-xs text-muted-foreground">
					{t("metrics.emptyHint")}
				</p>
			)}
		</section>
	);
}
