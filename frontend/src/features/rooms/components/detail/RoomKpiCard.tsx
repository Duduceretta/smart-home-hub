import type { ComponentType } from "react";

interface RoomKpiCardProps {
	icon: ComponentType<{ className?: string }>;
	label: string;
	value: string;
	accentClassName: string;
	/** Sem hardware pra essa leitura (ex: ambiente sem sensor de umidade) —
	 * mostra `value` como texto discreto em vez do destaque numérico grande,
	 * pra não parecer erro de carregamento. */
	isUnavailable?: boolean;
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
	isUnavailable = false,
}: RoomKpiCardProps) {
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
