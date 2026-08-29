import {
	ArrowUpDown,
	Clock,
	FileEdit,
	Filter,
	Power,
	PowerOff,
	Radio,
} from "lucide-react";
import type { ComponentType } from "react";
import { useEffect, useRef, useState } from "react";
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

interface AutomationFilterRailProps {
	automations: AutomationView[];
	filter: AutomationFilter;
	onFilterChange: (filter: AutomationFilter) => void;
	sort: AutomationSort;
	onSortChange: (sort: AutomationSort) => void;
}

interface FilterChip {
	value: AutomationFilter;
	label: string;
	icon: ComponentType<{ className?: string }>;
	count: number;
}

/**
 * Trilha vertical de filtro em formato de gaveta — substitui as antigas
 * pills horizontais (`AutomationFilterChips`). Recolhida (~52px) o tempo
 * todo por padrão, mostrando só ícone + indicador de filtro ativo (nunca só
 * cor — barra lateral + fundo preenchido) + badge de contagem. Expande em
 * overlay (absolute, sobrepõe a borda esquerda da lista) no hover do mouse
 * OU no toque/clique — a largura reservada no layout nunca muda, então
 * lista/detalhe não saltam de largura.
 *
 * `pinned` cobre o caso touch (sem `mouseleave`): clicar em um filtro marca
 * `pinned=true` e a trilha só fecha de novo com um clique/toque fora dela
 * (listener de `pointerdown` no document). `hovered` cobre mouse — some
 * assim que o ponteiro sai da trilha, independente de `pinned`.
 */
export function AutomationFilterRail({
	automations,
	filter,
	onFilterChange,
	sort,
	onSortChange,
}: AutomationFilterRailProps) {
	const railRef = useRef<HTMLDivElement>(null);
	const [hovered, setHovered] = useState(false);
	const [pinned, setPinned] = useState(false);
	const expanded = hovered || pinned;

	useEffect(() => {
		if (!pinned) return;

		const handlePointerDown = (event: PointerEvent) => {
			if (!railRef.current?.contains(event.target as Node)) {
				setPinned(false);
			}
		};

		document.addEventListener("pointerdown", handlePointerDown);
		return () => document.removeEventListener("pointerdown", handlePointerDown);
	}, [pinned]);

	const statusChips: FilterChip[] = [
		{ value: "all", label: "Todas", icon: Filter, count: automations.length },
		{
			value: "active",
			label: "Ativas",
			icon: Power,
			count: automations.filter((a) => a.isActive).length,
		},
		{
			value: "inactive",
			label: "Inativas",
			icon: PowerOff,
			count: automations.filter((a) => !a.isActive).length,
		},
	];

	const triggerChips: FilterChip[] = [
		{
			value: "schedule",
			label: "Por horário",
			icon: Clock,
			count: automations.filter((a) => a.triggerKind === "schedule").length,
		},
		{
			value: "sensor",
			label: "Por sensor",
			icon: Radio,
			count: automations.filter((a) => a.triggerKind === "sensor").length,
		},
	];

	const draftChips: FilterChip[] = [
		{
			value: "draft",
			label: "Rascunhos",
			icon: FileEdit,
			count: automations.filter((a) => a.isDraft).length,
		},
	];

	const renderChip = (chip: FilterChip) => {
		const isActive = filter === chip.value;
		const Icon = chip.icon;

		return (
			<button
				key={chip.value}
				type="button"
				onClick={() => {
					onFilterChange(chip.value);
					setPinned(true);
				}}
				aria-pressed={isActive}
				aria-label={`${chip.label}, ${chip.count}`}
				title={expanded ? undefined : `${chip.label} (${chip.count})`}
				className={cn(
					"group relative flex h-10 shrink-0 items-center gap-2.5 rounded-lg px-2.5 text-left transition-all cursor-pointer",
					isActive
						? "bg-primary/10 text-foreground"
						: "text-muted-foreground hover:bg-surface-high hover:text-foreground",
				)}
			>
				<span
					className={cn(
						"absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-primary transition-opacity",
						isActive ? "opacity-100" : "opacity-0",
					)}
				/>

				<span className="relative flex h-5 w-5 shrink-0 items-center justify-center">
					<Icon
						className={cn(
							"h-4 w-4 transition-colors",
							isActive
								? "text-primary"
								: "text-muted-foreground group-hover:text-foreground",
						)}
					/>
					{chip.count > 0 && !expanded && (
						<span className="absolute -right-1.5 -top-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-surface-low px-0.5 text-[9px] font-bold tabular-nums leading-none text-foreground">
							{chip.count > 9 ? "9+" : chip.count}
						</span>
					)}
				</span>

				{expanded && (
					<span className="flex min-w-0 flex-1 items-center justify-between gap-2 whitespace-nowrap">
						<span
							className={cn(
								"truncate text-xs tracking-tight",
								isActive
									? "font-semibold text-foreground"
									: "font-medium text-muted-foreground group-hover:text-foreground",
							)}
						>
							{chip.label}
						</span>
						<span
							className={cn(
								"shrink-0 rounded-full px-1.5 py-0.2 text-[10px] font-semibold tabular-nums",
								isActive
									? "bg-primary/20 text-foreground"
									: "bg-surface-high text-muted-foreground",
							)}
						>
							{chip.count}
						</span>
					</span>
				)}
			</button>
		);
	};

	return (
		<section
			ref={railRef}
			aria-label="Filtros de automações"
			className="relative h-full w-13 shrink-0"
			onMouseEnter={() => setHovered(true)}
			onMouseLeave={() => setHovered(false)}
		>
			<div
				className={cn(
					"absolute inset-y-0 left-0 flex flex-col overflow-hidden rounded-xl bg-surface-low shadow-sm transition-[width] duration-200 ease-out",
					expanded ? "z-20 w-52 shadow-lg" : "z-10 w-13",
				)}
			>
				<div className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-1.5 scrollbar-thin">
					{statusChips.map(renderChip)}
					<div className="mx-2 my-1 h-px shrink-0 bg-border-subtle" />
					{triggerChips.map(renderChip)}
					<div className="mx-2 my-1 h-px shrink-0 bg-border-subtle" />
					{draftChips.map(renderChip)}
				</div>

				{expanded && (
					<div className="shrink-0 border-t border-border-subtle/50 bg-surface-container/50 p-2">
						<Select
							value={sort}
							onValueChange={(value) => onSortChange(value as AutomationSort)}
						>
							<SelectTrigger
								className="h-8 w-full gap-2 bg-surface-high/80 text-xs font-medium"
								size="sm"
							>
								<ArrowUpDown className="h-3 w-3 text-muted-foreground" />
								<SelectValue />
							</SelectTrigger>
							<SelectContent align="start" className="text-foreground">
								<SelectItem value="name" className="text-xs">
									Nome
								</SelectItem>
								<SelectItem value="status" className="text-xs">
									Status
								</SelectItem>
							</SelectContent>
						</Select>
					</div>
				)}
			</div>
		</section>
	);
}
