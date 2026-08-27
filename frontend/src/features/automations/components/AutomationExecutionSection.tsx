import { Bot, Clock } from "lucide-react";
import {
	Bar,
	BarChart,
	CartesianGrid,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { ActivityTimelineRow } from "@/core/components/activity/ActivityTimelineRow";
import { useAutomationExecutionHistory } from "../hooks/useAutomationExecutionHistory";
import { useAutomationWeekdayExecutions } from "../hooks/useAutomationWeekdayExecutions";
import { formatRelativeTime } from "../lib/format-relative-time";

const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const HISTORY_PAGE_SIZE = 8;

interface AutomationExecutionSectionProps {
	automationId: string;
}

/**
 * "Execuções por dia da semana" (gráfico de barras, últimos 30 dias) +
 * "Histórico de execução" (mesma SystemEvent/AutomationExecuted que a Linha
 * do Tempo do dashboard usa, só filtrada por essa automação) — as duas
 * seções dependem do mesmo dado real (backend), então vivem juntas aqui em
 * vez de espalhadas pelo `AutomationDetailPanel`.
 */
export function AutomationExecutionSection({
	automationId,
}: AutomationExecutionSectionProps) {
	const { data: weekdayCounts, isLoading: isLoadingWeekday } =
		useAutomationWeekdayExecutions(automationId);
	const { data: history, isLoading: isLoadingHistory } =
		useAutomationExecutionHistory(automationId, 1, HISTORY_PAGE_SIZE);

	const chartData = [...(weekdayCounts ?? [])]
		.sort((a, b) => a.dayOfWeek - b.dayOfWeek)
		.map((entry) => ({
			label: WEEKDAY_LABELS[entry.dayOfWeek],
			count: entry.count,
		}));
	const hasAnyExecution = chartData.some((entry) => entry.count > 0);

	const entries = history?.items ?? [];

	return (
		<div className="space-y-6">
			<div className="rounded-lg border border-border-subtle/20 bg-surface-container p-4">
				<div className="mb-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
					Execuções por dia da semana
				</div>

				{isLoadingWeekday ? (
					<div className="h-40 animate-pulse rounded-md bg-surface-high" />
				) : !hasAnyExecution ? (
					<p className="text-sm text-muted-foreground">
						Nenhuma execução registrada nos últimos 30 dias.
					</p>
				) : (
					<div className="h-40 w-full">
						<ResponsiveContainer width="100%" height="100%">
							<BarChart
								data={chartData}
								margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
							>
								<CartesianGrid
									strokeDasharray="3 6"
									stroke="var(--color-border-subtle)"
									strokeOpacity={0.15}
									vertical={false}
								/>
								<XAxis
									dataKey="label"
									stroke="var(--color-muted-foreground)"
									fontSize={11}
									tickLine={false}
									axisLine={false}
								/>
								<YAxis
									stroke="var(--color-muted-foreground)"
									fontSize={11}
									tickLine={false}
									axisLine={false}
									width={24}
									allowDecimals={false}
								/>
								<Tooltip
									cursor={{
										fill: "var(--color-surface-highest)",
										opacity: 0.4,
									}}
									contentStyle={{
										backgroundColor: "var(--color-surface-high)",
										borderColor: "rgba(70,70,75,0.3)",
										borderRadius: "8px",
										color: "var(--color-foreground)",
									}}
									labelStyle={{ color: "var(--color-muted-foreground)" }}
								/>
								<Bar
									dataKey="count"
									name="Execuções"
									fill="var(--color-warm)"
									radius={[4, 4, 0, 0]}
								/>
							</BarChart>
						</ResponsiveContainer>
					</div>
				)}
			</div>

			<div className="rounded-lg border border-border-subtle/20 bg-surface-container p-4">
				<div className="mb-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
					Histórico de execução
				</div>

				{isLoadingHistory ? (
					<div className="space-y-3">
						<div className="h-10 animate-pulse rounded-md bg-surface-high" />
						<div className="h-10 animate-pulse rounded-md bg-surface-high" />
					</div>
				) : entries.length === 0 ? (
					<div className="flex flex-col items-center justify-center gap-2 py-4 text-center">
						<Clock className="h-5 w-5 text-muted-foreground" />
						<p className="text-sm text-muted-foreground">
							Nenhuma execução registrada ainda.
						</p>
					</div>
				) : (
					<div className="relative flex flex-col gap-4">
						<div className="absolute left-[11px] top-2 bottom-2 w-px bg-border-subtle/20" />
						{entries.map((entry) => (
							<ActivityTimelineRow
								key={entry.id}
								icon={Bot}
								iconColorClassName={
									entry.isAlert ? "text-alert-foreground" : "text-warm"
								}
								borderColorClassName={
									entry.isAlert ? "border-alert-foreground" : "border-warm"
								}
								title={entry.title}
								description={entry.description}
								relativeTime={formatRelativeTime(entry.timestamp)}
							/>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
