import { Clock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { MetricCard, MetricEmpty } from "./MetricCard";

interface PeakHourCardProps {
	/** Horário no formato "HH:mm"; `null` quando não há ativações. */
	hour: string | null;
}

/**
 * Horário de pico: a hora do dia em que mais cenas são ativadas. Mesma estrutura da taxa de
 * sucesso (visual no meio, linha de rodapé reservada), para os dois textos finais ficarem
 * na mesma altura lado a lado.
 */
export function PeakHourCard({ hour }: PeakHourCardProps) {
	const { t } = useTranslation("scenes");

	return (
		<MetricCard title={t("metrics.peakHour")}>
			{hour === null ? (
				<MetricEmpty className="h-28" />
			) : (
				<div className="flex h-28 flex-col gap-1">
					<div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-1">
						<Clock className="h-5 w-5 text-muted-foreground" aria-hidden />
						<span className="text-3xl font-semibold tabular-nums text-foreground">
							{hour}
						</span>
					</div>
					<p className="m-0 h-4 shrink-0 truncate text-center text-xs leading-4 text-muted-foreground">
						{t("metrics.peakHint")}
					</p>
				</div>
			)}
		</MetricCard>
	);
}
