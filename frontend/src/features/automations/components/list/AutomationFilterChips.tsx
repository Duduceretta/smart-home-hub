import { Clock, FileEdit, Filter, Power, PowerOff, Radio } from "lucide-react";
import type { ComponentType } from "react";
import { useScrollFade } from "@/core/hooks/useScrollFade";
import { cn } from "@/core/utils";
import type {
	AutomationFilter,
	AutomationFilterCounts,
} from "../../types/automations.types";

interface FilterChipOption {
	value: AutomationFilter;
	label: string;
	icon: ComponentType<{ className?: string }>;
	count: number;
}

interface AutomationFilterChipsProps {
	counts: AutomationFilterCounts | undefined;
	filter: AutomationFilter;
	onFilterChange: (filter: AutomationFilter) => void;
	className?: string;
}

/**
 * Fileira horizontal de pills roláveis de filtro para telas estreitas (<lg) —
 * substitui a trilha vertical `AutomationFilterRail` no mobile, reaproveitando
 * exatamente o mesmo padrão de `DeviceTypeFilterChips` do Dashboard com
 * `useScrollFade` para indicação visual suave de transbordamento horizontal.
 */
export function AutomationFilterChips({
	counts,
	filter,
	onFilterChange,
	className,
}: AutomationFilterChipsProps) {
	const { ref, showLeftFade, showRightFade } = useScrollFade<HTMLDivElement>();

	const chips: FilterChipOption[] = [
		{ value: "all", label: "Todas", icon: Filter, count: counts?.total ?? 0 },
		{
			value: "active",
			label: "Ativas",
			icon: Power,
			count: counts?.active ?? 0,
		},
		{
			value: "inactive",
			label: "Inativas",
			icon: PowerOff,
			count: counts?.inactive ?? 0,
		},
		{
			value: "schedule",
			label: "Por horário",
			icon: Clock,
			count: counts?.schedule ?? 0,
		},
		{
			value: "sensor",
			label: "Por sensor",
			icon: Radio,
			count: counts?.sensor ?? 0,
		},
		{
			value: "draft",
			label: "Rascunhos",
			icon: FileEdit,
			count: counts?.draft ?? 0,
		},
	];

	return (
		<div className={cn("relative w-full", className)}>
			<div
				ref={ref}
				className="flex items-center gap-2 overflow-x-auto scrollbar-thin py-1 pr-8"
			>
				{chips.map((chip) => {
					const isActive = filter === chip.value;
					const Icon = chip.icon;
					return (
						<button
							key={chip.value}
							type="button"
							aria-pressed={isActive}
							onClick={() => onFilterChange(chip.value)}
							className={cn(
								"inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-xs font-medium tracking-wide transition-all cursor-pointer shadow-xs",
								isActive
									? "border-border bg-surface-high text-foreground"
									: "border-border-subtle bg-surface-container text-muted-foreground hover:border-border hover:bg-surface-high hover:text-foreground",
							)}
						>
							<Icon
								className={cn(
									"h-3.5 w-3.5 shrink-0 transition-colors",
									isActive ? "text-primary" : "text-muted-foreground",
								)}
							/>
							<span>{chip.label}</span>
							<span
								className={cn(
									"rounded-full px-1.5 py-0.2 text-[10px] font-semibold tabular-nums",
									isActive
										? "bg-surface-highest text-foreground"
										: "bg-surface-high text-muted-foreground",
								)}
							>
								{chip.count}
							</span>
						</button>
					);
				})}
			</div>

			{/* Fades indicando scroll horizontal */}
			<div
				className={cn(
					"pointer-events-none absolute inset-y-0 left-0 w-8 bg-linear-to-r from-background to-transparent transition-opacity duration-150",
					showLeftFade ? "opacity-100" : "opacity-0",
				)}
			/>
			<div
				className={cn(
					"pointer-events-none absolute inset-y-0 right-0 w-8 bg-linear-to-l from-background to-transparent transition-opacity duration-150",
					showRightFade ? "opacity-100" : "opacity-0",
				)}
			/>
		</div>
	);
}
