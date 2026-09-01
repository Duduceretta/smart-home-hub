import { useMemo, useRef, useState } from "react";
import { useDebouncedValue } from "@/core/hooks/useDebouncedValue";
import { useEventHistory } from "../hooks/useEventHistory";
import { useEventHistoryStats } from "../hooks/useEventHistoryStats";
import { useEventStream } from "../hooks/useEventStream";
import { useHistoryUIStore } from "../store/history-ui.store";
import type {
	EventSeverityName,
	EventSourceName,
	GetHistoryParams,
	GetHistoryStatsParams,
} from "../types/history.types";
import { HistoryBackToTopButton } from "./HistoryBackToTopButton";
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
 * multi-row inline accordion expansion, real-time SignalR event synchronization, and floating scroll-to-top button.
 */
export function HistoryView() {
	const containerRef = useRef<HTMLDivElement>(null);

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
	const clearPendingEvents = useHistoryUIStore((s) => s.clearPendingEvents);

	const [isManualRefreshing, setIsManualRefreshing] = useState(false);

	// Debounce search query to prevent unnecessary server requests while typing
	const debouncedSearch = useDebouncedValue(searchQuery, 300);

	// Compute start and end dates in ISO string
	const { startDateUtc, endDateUtc } = useMemo(() => {
		const now = new Date();

		if (timeframe === "custom" && customStartDateUtc && customEndDateUtc) {
			return {
				startDateUtc: customStartDateUtc,
				endDateUtc: customEndDateUtc,
			};
		}

		// Para presets relativos (24h, 7d, etc.), endDateUtc com folga de 24h para o futuro
		// garante que eventos novos gravados enquanto a tela está aberta não sejam cortados
		// pela cláusula 'Timestamp <= EndDateUtc' do banco de dados.
		const end = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

		let pastDays = 7;
		if (timeframe === "24h") pastDays = 1;
		else if (timeframe === "30d") pastDays = 30;
		else if (timeframe === "all") pastDays = 365;

		const start = new Date(
			now.getTime() - pastDays * 24 * 60 * 60 * 1000,
		).toISOString();
		return { startDateUtc: start, endDateUtc: end };
	}, [timeframe, customStartDateUtc, customEndDateUtc]);

	const severity =
		selectedSeverity !== "all"
			? (selectedSeverity as EventSeverityName)
			: undefined;
	const source =
		selectedSource !== "all" ? (selectedSource as EventSourceName) : undefined;

	const queryParams: GetHistoryParams = {
		startDateUtc,
		endDateUtc,
		page,
		pageSize,
		search: debouncedSearch.trim() || undefined,
		severity,
		source,
	};

	const statsParams: GetHistoryStatsParams = {
		startDateUtc,
		endDateUtc,
		search: debouncedSearch.trim() || undefined,
		severity,
		source,
	};

	// Connect real-time SignalR listener to sync live events safely
	useEventStream(queryParams, containerRef);

	const { data, isLoading, isError, isFetching, refetch } =
		useEventHistory(queryParams);
	const {
		data: stats,
		isLoading: isStatsLoading,
		refetch: refetchStats,
	} = useEventHistoryStats(statsParams);

	const events = data?.items ?? [];
	const totalCount = data?.totalCount ?? 0;
	const totalPages = data?.totalPages ?? 1;

	const handleRefresh = async () => {
		setIsManualRefreshing(true);
		clearPendingEvents();
		try {
			await Promise.all([refetch(), refetchStats()]);
		} finally {
			setIsManualRefreshing(false);
		}
	};

	const handleToggleExpandAll = () => {
		if (events.length > 0 && expandedEventIds.length >= events.length) {
			collapseAllEvents();
		} else {
			expandAllEvents(events.map((e) => e.id));
		}
	};

	return (
		<div ref={containerRef} className="flex w-full flex-col gap-6 relative">
			{/* Page Header with Expand/Collapse All and Log Export */}
			<HistoryHeader
				events={events}
				isRefetching={isFetching || isStatsLoading || isManualRefreshing}
				expandedCount={expandedEventIds.length}
				onRefresh={handleRefresh}
				onToggleExpandAll={handleToggleExpandAll}
			/>

			{/* KPI Summary Cards */}
			<HistoryKpiCards stats={stats} isLoading={isStatsLoading} />

			{/* Filter Controls Bar */}
			<HistoryFiltersBar />

			{/* Main Audit Content (100% Server-Side Driven) */}
			{isLoading ? (
				<HistorySkeleton />
			) : isError ? (
				<HistoryEmptyState isError onRetry={handleRefresh} />
			) : events.length === 0 ? (
				<HistoryEmptyState />
			) : (
				<div className="flex flex-col gap-6">
					<HistoryTimeline
						events={events}
						queryParams={queryParams}
						expandedEventIds={expandedEventIds}
						containerRef={containerRef}
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

			{/* Floating Back to Top button */}
			<HistoryBackToTopButton containerRef={containerRef} />
		</div>
	);
}
