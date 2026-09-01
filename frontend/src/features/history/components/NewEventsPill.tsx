import { useQueryClient } from "@tanstack/react-query";
import { Radio } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { PagedResponse } from "@/core/types/pagination.types";
import { historyKeys } from "../hooks/history.keys";
import { scrollToTop } from "../hooks/useEventStream";
import { useHistoryUIStore } from "../store/history-ui.store";
import type { GetHistoryParams, HistoryEvent } from "../types/history.types";

interface NewEventsPillProps {
	queryParams: GetHistoryParams;
	containerRef?: React.RefObject<HTMLElement | null>;
}

/**
 * Sticky pill button rendered above the history timeline when new real-time events arrive.
 * Clicking it merges the pending events into the TanStack cache and scrolls to top smoothly.
 */
export function NewEventsPill({
	queryParams,
	containerRef,
}: NewEventsPillProps) {
	const { t } = useTranslation("history");
	const queryClient = useQueryClient();
	const pendingEvents = useHistoryUIStore((s) => s.pendingEvents);
	const clearPendingEvents = useHistoryUIStore((s) => s.clearPendingEvents);

	if (pendingEvents.total === 0) {
		return null;
	}

	const handleApplyPendingEvents = () => {
		if (pendingEvents.items.length === 0) {
			clearPendingEvents();
			return;
		}

		queryClient.setQueryData<PagedResponse<HistoryEvent>>(
			historyKeys.list(queryParams),
			(oldData) => {
				if (!oldData) {
					return {
						items: pendingEvents.items,
						page: 1,
						pageSize: 20,
						totalCount: pendingEvents.total,
						totalPages: Math.ceil(pendingEvents.total / 20) || 1,
						hasNextPage: false,
						hasPreviousPage: false,
					};
				}

				const existingIds = new Set(oldData.items.map((event) => event.id));
				const uniqueNew = pendingEvents.items.filter(
					(item) => !existingIds.has(item.id),
				);

				return {
					...oldData,
					items: [...uniqueNew, ...oldData.items],
					totalCount: oldData.totalCount + uniqueNew.length,
				};
			},
		);

		scrollToTop(containerRef?.current);
		clearPendingEvents();
	};

	const label =
		pendingEvents.mediaPlaybackCount > 0
			? pendingEvents.total === 1
				? t("newEvents.singleWithMedia", {
						total: pendingEvents.total,
						mediaCount: pendingEvents.mediaPlaybackCount,
					})
				: t("newEvents.pluralWithMedia", {
						total: pendingEvents.total,
						mediaCount: pendingEvents.mediaPlaybackCount,
					})
			: pendingEvents.total === 1
				? t("newEvents.single", { count: pendingEvents.total })
				: t("newEvents.plural", { count: pendingEvents.total });

	return (
		<div className="sticky top-2 z-20 flex justify-center w-full my-2 pointer-events-auto">
			<button
				type="button"
				onClick={handleApplyPendingEvents}
				className="group inline-flex items-center gap-2.5 rounded-full border border-border bg-surface-high/95 backdrop-blur-md px-4 py-1.5 text-xs font-medium text-primary shadow-md hover:bg-surface-highest hover:border-border transition-all duration-200 cursor-pointer animate-in fade-in-50 zoom-in-95 active:scale-95"
				aria-label={label}
			>
				<span className="relative flex h-2 w-2">
					<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
					<span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
				</span>

				<Radio className="h-3.5 w-3.5 text-primary shrink-0 transition-transform group-hover:scale-110" />

				<span>{label}</span>
			</button>
		</div>
	);
}
