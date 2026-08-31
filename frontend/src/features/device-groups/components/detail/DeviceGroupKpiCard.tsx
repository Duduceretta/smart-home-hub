import type { ComponentType } from "react";

interface DeviceGroupKpiCardProps {
	icon: ComponentType<{ className?: string }>;
	label: string;
	value: string | number;
	accentClassName?: string;
	isUnavailable?: boolean;
}

/**
 * Vertical KPI card standard in the design system (label above, prominent value below).
 */
export function DeviceGroupKpiCard({
	icon: Icon,
	label,
	value,
	accentClassName = "text-foreground",
	isUnavailable = false,
}: DeviceGroupKpiCardProps) {
	return (
		<div className="flex flex-col gap-1 rounded-lg border border-border-subtle/20 bg-surface-container p-4">
			<span className="flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
				<Icon className="h-3 w-3" />
				{label}
			</span>
			{isUnavailable ? (
				<span className="text-sm font-medium text-muted-foreground/70">
					{value}
				</span>
			) : (
				<span className={`text-2xl font-semibold ${accentClassName}`}>
					{value}
				</span>
			)}
		</div>
	);
}
