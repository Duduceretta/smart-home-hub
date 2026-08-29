export function RoomDeviceSectionSkeleton() {
	return (
		<div className="flex flex-col gap-4 animate-pulse">
			<div className="h-4 w-36 rounded-md bg-surface-high" />
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
				{["sk-1", "sk-2"].map((key) => (
					<div
						key={key}
						className="h-44 rounded-xl border border-border-subtle bg-surface-container p-4"
					>
						<div className="flex items-center justify-between">
							<div className="h-9 w-9 rounded-lg bg-surface-high" />
							<div className="h-6 w-11 rounded-full bg-surface-high" />
						</div>
						<div className="mt-8 flex flex-col gap-2">
							<div className="h-4 w-2/3 rounded-sm bg-surface-high" />
							<div className="h-3 w-1/3 rounded-sm bg-surface-high/60" />
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
