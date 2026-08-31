import { useMemo } from "react";
import type { HistoryEvent } from "../types/history.types";
import { getLocalDateKey } from "../utils/formatHistoryDate";
import { HistoryDateGroup } from "./HistoryDateGroup";

interface HistoryTimelineProps {
	events: HistoryEvent[];
	onSelectEvent: (event: HistoryEvent) => void;
}

/**
 * Audit timeline view grouping events by relative date header.
 */
export function HistoryTimeline({
	events,
	onSelectEvent,
}: HistoryTimelineProps) {
	// Group events by local calendar date (YYYY-MM-DD)
	const groupedEvents = useMemo(() => {
		const groups = new Map<string, HistoryEvent[]>();

		for (const event of events) {
			const dateKey = getLocalDateKey(event.timestampUtc);
			const currentGroup = groups.get(dateKey) || [];
			currentGroup.push(event);
			groups.set(dateKey, currentGroup);
		}

		return Array.from(groups.entries()).map(([dateKey, items]) => ({
			dateKey,
			items,
		}));
	}, [events]);

	return (
		<div className="flex flex-col gap-6">
			{groupedEvents.map(({ dateKey, items }) => (
				<HistoryDateGroup
					key={dateKey}
					dateKey={dateKey}
					events={items}
					onSelectEvent={onSelectEvent}
				/>
			))}
		</div>
	);
}
