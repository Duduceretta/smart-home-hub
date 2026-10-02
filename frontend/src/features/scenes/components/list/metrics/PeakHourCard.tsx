import { Clock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { MetricCard, MetricEmpty } from "./MetricCard";

interface PeakHourCardProps {
	/** Horário no formato "HH:mm"; `null` quando não há ativações. */
	hour: string | null;
}

/** Horário de pico: a hora do dia em que mais cenas são ativadas. */
export function PeakHourCard({ hour }: PeakHourCardProps) {
	const { t } = useTranslation("scenes");

	return (
		<MetricCard title={t("metrics.peakHour")}>
			{hour === null ? (
				<MetricEmpty className="h-28" />
			) : (
				<div className="flex h-28 flex-col items-center justify-center gap-2">
					<Clock className="h-5 w-5 text-muted-foreground" aria-hidden />
					<span className="text-3xl font-semibold tabular-nums text-foreground">
						{hour}
					</span>
					<span className="text-center text-xs text-muted-foreground">
						{t("metrics.peakHint")}
					</span>
				</div>
			)}
		</MetricCard>
	);
}
