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
 * Clicking it merges the pending events into the Page 1 cache, resets pagination to Page 1,
 * scrolls to top smoothly and clears the pending buffer.
 */
export function NewEventsPill({
	queryParams,
	containerRef,
}: NewEventsPillProps) {
	const { t } = useTranslation("history");
	const queryClient = useQueryClient();
	const pendingEvents = useHistoryUIStore((s) => s.pendingEvents);
	const clearPendingEvents = useHistoryUIStore((s) => s.clearPendingEvents);
	const setPage = useHistoryUIStore((s) => s.setPage);

	if (pendingEvents.total === 0) {
		return null;
	}

	const handleApplyPendingEvents = () => {
		const page1Params: GetHistoryParams = {
			...queryParams,
			page: 1,
		};

		if (pendingEvents.items.length > 0) {
			queryClient.setQueryData<PagedResponse<HistoryEvent>>(
				historyKeys.list(page1Params),
				(oldData) => {
					const pageSize = queryParams.pageSize || 20;

					if (!oldData) {
						return {
							items: pendingEvents.items,
							page: 1,
							pageSize,
							totalCount: pendingEvents.total,
							totalPages: Math.ceil(pendingEvents.total / pageSize) || 1,
							hasNextPage: false,
							hasPreviousPage: false,
						};
					}

					const existingIds = new Set(oldData.items.map((event) => event.id));
					const uniqueNew = pendingEvents.items.filter(
						(item) => !existingIds.has(item.id),
					);
					const newTotal = oldData.totalCount + uniqueNew.length;

					return {
						...oldData,
						items: [...uniqueNew, ...oldData.items],
						totalCount: newTotal,
						totalPages:
							Math.ceil(newTotal / (oldData.pageSize || pageSize)) || 1,
					};
				},
			);
		}

		// Garante a transição para a página 1
		setPage(1);

		// Rola suavemente ao topo
		scrollToTop(containerRef?.current);

		// Limpa o buffer de novos eventos
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
				className="group inline-flex h-11 sm:h-9 items-center gap-2.5 rounded-full border border-border bg-surface-high/95 backdrop-blur-md px-4 text-xs font-medium text-primary shadow-md hover:bg-surface-highest hover:border-border transition-all duration-200 cursor-pointer animate-in fade-in-50 zoom-in-95 active:scale-95"
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
