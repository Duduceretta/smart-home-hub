import { AutomationSkeletonRow } from "@/features/dashboard/components/ActiveAutomationsCard";

const SKELETON_ROW_IDS = ["sk-1", "sk-2", "sk-3", "sk-4", "sk-5"];

/**
 * Mirrors the full `AutomationListPanel` shell (header with counter/segmented
 * control/search/create button + list rows) — during `isLoadingAutomations`
 * none of the real panel exists yet, so the skeleton must cover the whole
 * panel, not just the rows, to avoid a layout jump when the bordered/rounded
 * card appears all at once. Reuses `AutomationSkeletonRow` (already
 * co-located in `ActiveAutomationsCard.tsx`, Dashboard) instead of a new
 * visual shape for the same kind of row.
 */
export function AutomationListPanelSkeleton() {
	return (
		<div
			role="status"
			aria-busy="true"
			className="flex h-full max-h-full w-full flex-col overflow-hidden rounded-xl bg-surface-low shadow-sm animate-pulse"
		>
			<div className="flex shrink-0 flex-col gap-2.5 bg-surface-container/50 p-3">
				<div className="flex items-center justify-between">
					<div className="h-4 w-28 rounded-sm bg-surface-high" />
					<div className="h-6 w-14 rounded-md bg-surface-high/60" />
				</div>
				<div className="flex items-center gap-2">
					<div className="h-8 flex-1 rounded-lg bg-surface-high/80" />
					<div className="h-8 w-8 shrink-0 rounded-lg bg-surface-high/80" />
				</div>
			</div>

			<div className="flex-1 space-y-2 overflow-hidden p-3">
				{SKELETON_ROW_IDS.map((id) => (
					<AutomationSkeletonRow key={id} />
				))}
			</div>
		</div>
	);
}
