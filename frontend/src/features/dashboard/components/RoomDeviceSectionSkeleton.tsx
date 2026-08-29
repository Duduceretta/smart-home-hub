export function RoomDeviceSectionSkeleton() {
	return (
		<div className="flex flex-col gap-3 animate-pulse">
			<div className="h-3 w-32 bg-surface-container rounded-md" />
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
				{["sk-1", "sk-2"].map((key) => (
					<div
						key={key}
						className="h-44 rounded-xl border border-border-subtle/20 bg-surface-high"
					/>
				))}
			</div>
		</div>
	);
}
