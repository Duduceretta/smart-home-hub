import { useMemo } from "react";
import type { GetHistoryParams, HistoryEvent } from "../types/history.types";
import { getLocalDateKey } from "../utils/formatHistoryDate";
import { HistoryDateGroup } from "./HistoryDateGroup";
import { NewEventsPill } from "./NewEventsPill";

interface HistoryTimelineProps {
	events: HistoryEvent[];
	queryParams: GetHistoryParams;
	expandedEventIds: string[];
	containerRef?: React.RefObject<HTMLElement | null>;
	onToggleExpand: (id: string) => void;
}

/**
 * Audit timeline view grouping events by relative date header, with real-time NewEventsPill.
 */
export function HistoryTimeline({
	events,
	queryParams,
	expandedEventIds,
	containerRef,
	onToggleExpand,
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
		<div className="flex flex-col gap-6 motion-safe:animate-in motion-safe:fade-in-50 motion-safe:duration-150">
			{/* Sticky real-time new events notification pill */}
			<NewEventsPill queryParams={queryParams} containerRef={containerRef} />

			{groupedEvents.map(({ dateKey, items }) => (
				<HistoryDateGroup
					key={dateKey}
					dateKey={dateKey}
					events={items}
					expandedEventIds={expandedEventIds}
					onToggleExpand={onToggleExpand}
				/>
			))}
		</div>
	);
}
