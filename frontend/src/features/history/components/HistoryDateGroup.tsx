import { useTranslation } from "react-i18next";
import type { HistoryEvent } from "../types/history.types";
import { formatRelativeDateGroup } from "../utils/formatHistoryDate";
import { HistoryEventRow } from "./HistoryEventRow";

interface HistoryDateGroupProps {
	dateKey: string;
	events: HistoryEvent[];
	expandedEventId: string | null;
	onToggleExpand: (id: string) => void;
}

/**
 * Group of events sharing the same calendar day in local time.
 */
export function HistoryDateGroup({
	events,
	expandedEventId,
	onToggleExpand,
}: HistoryDateGroupProps) {
	const { i18n } = useTranslation();
	const firstEventTime = events[0]?.timestampUtc;
	const dateHeader = firstEventTime
		? formatRelativeDateGroup(firstEventTime, i18n.language || "pt-BR")
		: "";

	return (
		<div className="flex flex-col gap-2">
			{/* Date Section Header */}
			<div className="flex items-center gap-2 px-1">
				<span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
					{dateHeader}
				</span>
				<div className="h-px flex-1 bg-border-subtle/60" />
				<span className="text-[11px] text-muted-foreground/60 font-mono">
					{events.length} {events.length === 1 ? "evento" : "eventos"}
				</span>
			</div>

			{/* Density Container Card */}
			<div className="rounded-2xl border border-border-subtle bg-surface-low divide-y divide-border-subtle/50 overflow-hidden shadow-xs">
				{events.map((event) => (
					<HistoryEventRow
						key={event.id}
						event={event}
						isExpanded={expandedEventId === event.id}
						onToggleExpand={onToggleExpand}
					/>
				))}
			</div>
		</div>
	);
}
