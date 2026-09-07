const SKELETON_ROW_IDS = ["sk-1", "sk-2", "sk-3", "sk-4", "sk-5"];

/**
 * Mirrors the full `DeviceGroupListPanel` shell (header with counter/segmented
 * control/search/create button + list rows) — during `isLoadingGroups` none
 * of the real panel exists yet, so the skeleton must cover the whole panel,
 * not just the rows, to avoid a layout jump when the bordered/rounded card
 * appears all at once.
 */
export function DeviceGroupListPanelSkeleton() {
	return (
		<div
			role="status"
			aria-busy="true"
			className="flex h-full max-h-full w-full flex-col overflow-hidden rounded-xl bg-surface-low shadow-sm animate-pulse"
		>
			<div className="flex shrink-0 flex-col gap-2.5 bg-surface-container/50 p-3">
				<div className="flex items-center justify-between">
					<div className="h-4 w-20 rounded-sm bg-surface-high" />
					<div className="h-6 w-14 rounded-md bg-surface-high/60" />
				</div>
				<div className="flex items-center gap-2">
					<div className="h-8 flex-1 rounded-lg bg-surface-high/80" />
					<div className="h-8 w-8 shrink-0 rounded-lg bg-surface-high/80" />
				</div>
			</div>

			<div className="flex-1 space-y-2 overflow-hidden p-3">
				{SKELETON_ROW_IDS.map((id) => (
					<div
						key={id}
						className="flex h-16 items-center gap-3 rounded-lg bg-surface-container/60 p-3"
					>
						<div className="h-10 w-10 shrink-0 rounded-full bg-surface-high" />
						<div className="flex min-w-0 flex-1 flex-col gap-1.5">
							<div className="h-3.5 w-2/3 rounded-sm bg-surface-high" />
							<div className="h-3 w-1/3 rounded-sm bg-surface-high/60" />
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
