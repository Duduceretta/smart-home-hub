/**
 * Skeleton loading placeholder matching the History KPI cards and Timeline table layout.
 */
export function HistorySkeleton() {
	return (
		<div className="flex flex-col gap-6 animate-pulse">
			{/* KPI Cards Skeleton */}
			<div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
				{[0, 1, 2, 3].map((i) => (
					<div
						key={i}
						className="h-20 rounded-2xl border border-border-subtle bg-surface-low p-4"
					/>
				))}
			</div>

			{/* Filter Bar Skeleton */}
			<div className="h-16 rounded-2xl border border-border-subtle bg-surface-low" />

			{/* Timeline Group 1 */}
			<div className="flex flex-col gap-2">
				<div className="h-4 w-36 rounded bg-surface-high" />
				<div className="rounded-2xl border border-border-subtle bg-surface-low overflow-hidden divide-y divide-border-subtle/50">
					{[0, 1, 2, 3, 4].map((i) => (
						<div key={i} className="h-12 bg-surface-low/50 px-4 py-3" />
					))}
				</div>
			</div>

			{/* Timeline Group 2 */}
			<div className="flex flex-col gap-2">
				<div className="h-4 w-36 rounded bg-surface-high" />
				<div className="rounded-2xl border border-border-subtle bg-surface-low overflow-hidden divide-y divide-border-subtle/50">
					{[0, 1, 2].map((i) => (
						<div key={i} className="h-12 bg-surface-low/50 px-4 py-3" />
					))}
				</div>
			</div>
		</div>
	);
}
