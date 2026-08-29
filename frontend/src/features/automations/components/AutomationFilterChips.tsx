import { ArrowUpDown } from "lucide-react";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/core/components/ui/select";
import { cn } from "@/core/utils";
import type {
	AutomationFilter,
	AutomationSort,
	AutomationView,
} from "../types/automations.types";

interface AutomationFilterChipsProps {
	automations: AutomationView[];
	filter: AutomationFilter;
	onFilterChange: (filter: AutomationFilter) => void;
	sort: AutomationSort;
	onSortChange: (sort: AutomationSort) => void;
}

export function AutomationFilterChips({
	automations,
	filter,
	onFilterChange,
	sort,
	onSortChange,
}: AutomationFilterChipsProps) {
	const chips: { value: AutomationFilter; label: string; count: number }[] = [
		{ value: "all", label: "Todas", count: automations.length },
		{
			value: "active",
			label: "Ativas",
			count: automations.filter((a) => a.isActive).length,
		},
		{
			value: "inactive",
			label: "Inativas",
			count: automations.filter((a) => !a.isActive).length,
		},
		{
			value: "schedule",
			label: "Por horário",
			count: automations.filter((a) => a.triggerKind === "schedule").length,
		},
		{
			value: "sensor",
			label: "Por sensor",
			count: automations.filter((a) => a.triggerKind === "sensor").length,
		},
		{
			value: "draft",
			label: "Rascunhos",
			count: automations.filter((a) => a.isDraft).length,
		},
	];

	return (
		<div className="flex flex-wrap items-center justify-between gap-2">
			<div className="flex flex-wrap items-center gap-2">
				{chips.map((chip) => (
					<button
						key={chip.value}
						type="button"
						onClick={() => onFilterChange(chip.value)}
						aria-pressed={filter === chip.value}
						className={cn(
							"inline-flex h-8 items-center gap-1 rounded-full border px-3 text-sm font-medium transition-colors cursor-pointer",
							filter === chip.value
								? "border-primary/40 bg-primary/10 text-primary"
								: "border-border-subtle bg-surface-container text-muted-foreground hover:text-foreground",
						)}
					>
						{chip.label}
						<span
							className={cn(
								"rounded-full px-2 text-xs",
								filter === chip.value
									? "bg-primary/20"
									: "bg-surface-high text-muted-foreground",
							)}
						>
							{chip.count}
						</span>
					</button>
				))}
			</div>

			<Select
				value={sort}
				onValueChange={(value) => onSortChange(value as AutomationSort)}
			>
				<SelectTrigger className="h-8 gap-2 text-sm" size="sm">
					<ArrowUpDown className="h-3 w-3 text-muted-foreground" />
					<SelectValue />
				</SelectTrigger>
				<SelectContent align="end">
					<SelectItem value="name">Nome</SelectItem>
					<SelectItem value="status">Status</SelectItem>
				</SelectContent>
			</Select>
		</div>
	);
}
