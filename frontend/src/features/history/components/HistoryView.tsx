import { useMemo } from "react";
import { useEventHistory } from "../hooks/useEventHistory";
import { useHistoryUIStore } from "../store/history-ui.store";
import type { GetHistoryParams } from "../types/history.types";
import { HistoryEmptyState } from "./HistoryEmptyState";
import { HistoryEventDetailModal } from "./HistoryEventDetailModal";
import { HistoryFiltersBar } from "./HistoryFiltersBar";
import { HistoryHeader } from "./HistoryHeader";
import { HistoryKpiCards } from "./HistoryKpiCards";
import { HistoryPagination } from "./HistoryPagination";
import { HistorySkeleton } from "./HistorySkeleton";
import { HistoryTimeline } from "./HistoryTimeline";

/**
 * Main feature container for History & Audit Trail.
 * Formats query params from Zustand store, fetches data, and renders full audit layout.
 */
export function HistoryView() {
	const searchQuery = useHistoryUIStore((s) => s.searchQuery);
	const selectedSeverity = useHistoryUIStore((s) => s.selectedSeverity);
	const selectedSource = useHistoryUIStore((s) => s.selectedSource);
	const timeframe = useHistoryUIStore((s) => s.timeframe);
	const customStartDateUtc = useHistoryUIStore((s) => s.customStartDateUtc);
	const customEndDateUtc = useHistoryUIStore((s) => s.customEndDateUtc);
	const page = useHistoryUIStore((s) => s.page);
	const pageSize = useHistoryUIStore((s) => s.pageSize);
	const selectedEvent = useHistoryUIStore((s) => s.selectedEvent);

	const setPage = useHistoryUIStore((s) => s.setPage);
	const setSelectedEvent = useHistoryUIStore((s) => s.setSelectedEvent);

	// Compute start and end dates in ISO string
	const { startDateUtc, endDateUtc } = useMemo(() => {
		const now = new Date();
		const end = now.toISOString();

		if (timeframe === "custom" && customStartDateUtc && customEndDateUtc) {
			return {
				startDateUtc: customStartDateUtc,
				endDateUtc: customEndDateUtc,
			};
		}

		let pastDays = 7;
		if (timeframe === "24h") pastDays = 1;
		else if (timeframe === "30d") pastDays = 30;
		else if (timeframe === "all") pastDays = 365;

		const start = new Date(
			now.getTime() - pastDays * 24 * 60 * 60 * 1000,
		).toISOString();
		return { startDateUtc: start, endDateUtc: end };
	}, [timeframe, customStartDateUtc, customEndDateUtc]);

	const queryParams: GetHistoryParams = {
		startDateUtc,
		endDateUtc,
		page,
		pageSize,
		search: searchQuery.trim() || undefined,
		severity: selectedSeverity !== "all" ? selectedSeverity : undefined,
		source: selectedSource !== "all" ? selectedSource : undefined,
	};

	const { data, isLoading, isError, isFetching, refetch } =
		useEventHistory(queryParams);

	const events = data?.items ?? [];
	const totalCount = data?.totalCount ?? 0;
	const totalPages = data?.totalPages ?? 1;

	// Client-side text filter refinement for instant responsiveness
	const filteredEvents = useMemo(() => {
		if (!searchQuery.trim()) return events;
		const q = searchQuery.toLowerCase();
		return events.filter(
			(e) =>
				e.description.toLowerCase().includes(q) ||
				e.deviceName?.toLowerCase().includes(q) ||
				e.roomName?.toLowerCase().includes(q) ||
				e.deviceGroupName?.toLowerCase().includes(q) ||
				e.eventType.toLowerCase().includes(q),
		);
	}, [events, searchQuery]);

	return (
		<div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
			{/* Page Header */}
			<HistoryHeader
				events={events}
				isRefetching={isFetching && !isLoading}
				onRefresh={() => refetch()}
			/>

			{/* KPI Summary Cards */}
			<HistoryKpiCards events={events} totalCount={totalCount} />

			{/* Filter Controls Bar */}
			<HistoryFiltersBar />

			{/* Main Audit Content */}
			{isLoading ? (
				<HistorySkeleton />
			) : isError ? (
				<HistoryEmptyState isError onRetry={() => refetch()} />
			) : filteredEvents.length === 0 ? (
				<HistoryEmptyState />
			) : (
				<div className="flex flex-col gap-6">
					<HistoryTimeline
						events={filteredEvents}
						onSelectEvent={(event) => setSelectedEvent(event)}
					/>

					<HistoryPagination
						page={page}
						totalPages={totalPages}
						totalCount={totalCount}
						onPageChange={setPage}
					/>
				</div>
			)}

			{/* Detail Modal */}
			<HistoryEventDetailModal
				event={selectedEvent}
				isOpen={Boolean(selectedEvent)}
				onClose={() => setSelectedEvent(null)}
			/>
		</div>
	);
}
