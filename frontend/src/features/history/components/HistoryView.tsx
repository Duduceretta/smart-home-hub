import { useMemo } from "react";
import { useDebouncedValue } from "@/core/hooks/useDebouncedValue";
import { useEventHistory } from "../hooks/useEventHistory";
import { useHistoryUIStore } from "../store/history-ui.store";
import type { GetHistoryParams } from "../types/history.types";
import { HistoryEmptyState } from "./HistoryEmptyState";
import { HistoryFiltersBar } from "./HistoryFiltersBar";
import { HistoryHeader } from "./HistoryHeader";
import { HistoryKpiCards } from "./HistoryKpiCards";
import { HistoryPagination } from "./HistoryPagination";
import { HistorySkeleton } from "./HistorySkeleton";
import { HistoryTimeline } from "./HistoryTimeline";

/**
 * Main feature container for History & Audit Trail.
 * Stretches 100% full-width, uses strictly server-side filtering (dates, source, severity, search, pagination),
 * and provides multi-row inline accordion expansion.
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
	const expandedEventIds = useHistoryUIStore((s) => s.expandedEventIds);

	const setPage = useHistoryUIStore((s) => s.setPage);
	const toggleExpandEvent = useHistoryUIStore((s) => s.toggleExpandEvent);
	const expandAllEvents = useHistoryUIStore((s) => s.expandAllEvents);
	const collapseAllEvents = useHistoryUIStore((s) => s.collapseAllEvents);

	// Debounce search query to prevent unnecessary server requests while typing
	const debouncedSearch = useDebouncedValue(searchQuery, 300);

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
		search: debouncedSearch.trim() || undefined,
		severity: selectedSeverity !== "all" ? selectedSeverity : undefined,
		source: selectedSource !== "all" ? selectedSource : undefined,
	};

	const { data, isLoading, isError, isFetching, refetch } =
		useEventHistory(queryParams);

	const events = data?.items ?? [];
	const totalCount = data?.totalCount ?? 0;
	const totalPages = data?.totalPages ?? 1;

	const handleToggleExpandAll = () => {
		if (events.length > 0 && expandedEventIds.length >= events.length) {
			collapseAllEvents();
		} else {
			expandAllEvents(events.map((e) => e.id));
		}
	};

	return (
		<div className="flex w-full flex-col gap-6">
			{/* Page Header with Expand/Collapse All and Log Export */}
			<HistoryHeader
				events={events}
				isRefetching={isFetching && !isLoading}
				expandedCount={expandedEventIds.length}
				onRefresh={() => refetch()}
				onToggleExpandAll={handleToggleExpandAll}
			/>

			{/* KPI Summary Cards */}
			<HistoryKpiCards events={events} totalCount={totalCount} />

			{/* Filter Controls Bar */}
			<HistoryFiltersBar />

			{/* Main Audit Content (100% Server-Side Driven) */}
			{isLoading ? (
				<HistorySkeleton />
			) : isError ? (
				<HistoryEmptyState isError onRetry={() => refetch()} />
			) : events.length === 0 ? (
				<HistoryEmptyState />
			) : (
				<div className="flex flex-col gap-6">
					<HistoryTimeline
						events={events}
						expandedEventIds={expandedEventIds}
						onToggleExpand={toggleExpandEvent}
					/>

					<HistoryPagination
						page={page}
						totalPages={totalPages}
						totalCount={totalCount}
						onPageChange={setPage}
					/>
				</div>
			)}
		</div>
	);
}
