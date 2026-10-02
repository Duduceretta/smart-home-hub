import { useTranslation } from "react-i18next";
import type { SceneMetrics } from "../../types/scenes.types";
import { ActivationsCard } from "./metrics/ActivationsCard";
import { PeakHourCard } from "./metrics/PeakHourCard";
import { SuccessRateCard } from "./metrics/SuccessRateCard";
import { TopScenesCard } from "./metrics/TopScenesCard";

const DAYS_IN_CHART = 7;

interface SceneMetricsPanelProps {
	/** `null` enquanto não há dados (ou o backend ainda não os fornece): cada card mostra o estado vazio. */
	metrics: SceneMetrics | null;
	/** Relógio injetável para os rótulos dos dias nos testes. */
	now?: number;
}

/**
 * Desempenho das cenas, na coluna lateral da tela, em 4 cards com gráfico do Recharts:
 * ativações dos últimos 7 dias, taxa de sucesso, cenas mais ativadas e horário de pico.
 * Os cards ficam sempre na tela; sem dados cada um mostra o próprio estado vazio.
 */
export function SceneMetricsPanel({ metrics, now }: SceneMetricsPanelProps) {
	const { t } = useTranslation("scenes");
	const hasData = metrics !== null && metrics.activationsTotal > 0;
	const perDay =
		metrics?.activationsPerDay ??
		Array.from({ length: DAYS_IN_CHART }, () => 0);

	return (
		<section aria-label={t("metrics.title")} className="flex flex-col gap-4">
			<ActivationsCard
				perDay={perDay}
				total={metrics?.activationsTotal ?? 0}
				hasData={hasData}
				now={now}
			/>
			<div className="grid grid-cols-2 gap-4">
				<SuccessRateCard
					rate={hasData ? (metrics?.successRate ?? null) : null}
				/>
				<PeakHourCard hour={hasData ? (metrics?.peakHour ?? null) : null} />
			</div>
			<TopScenesCard scenes={hasData ? (metrics?.topScenes ?? []) : []} />
		</section>
	);
}
