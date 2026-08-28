import type { ComponentType } from "react";

interface RoomKpiCardProps {
	icon: ComponentType<{ className?: string }>;
	label: string;
	value: string;
	accentClassName: string;
}

/**
 * KPI vertical padrão do design system (label acima, valor em destaque
 * abaixo). Usado pelo `RoomClimateSection` (temperatura/umidade) e pelo
 * `RoomEnergyChart` (consumo total do período).
 */
export function RoomKpiCard({
	icon: Icon,
	label,
	value,
	accentClassName,
}: RoomKpiCardProps) {
	return (
		<div className="flex flex-col gap-1 rounded-lg border border-border-subtle/20 bg-surface-container p-4">
			<span className="flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
				<Icon className="h-3 w-3" />
				{label}
			</span>
			<span className={`text-2xl font-semibold ${accentClassName}`}>
				{value}
			</span>
		</div>
	);
}
