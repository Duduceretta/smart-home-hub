import { Switch } from "@/core/components/ui/switch";
import { cn } from "@/core/utils";
import { AUTOMATION_TRIGGER_ICON } from "../constants/automations.constants";
import { formatRelativeTime } from "../lib/format-relative-time";
import type { AutomationView } from "../types/automations.types";

interface AutomationRowProps {
	automation: AutomationView;
	isSelected: boolean;
	onSelect: (id: string) => void;
	onToggle: (id: string, nextValue: boolean) => void;
}

/**
 * Linha densa estilo Gmail/tabela — uma automação por linha, ~44px de
 * altura, sem padding vertical generoso. Mesma seleção do AutomationCard,
 * só muda a apresentação.
 */
export function AutomationRow({
	automation,
	isSelected,
	onSelect,
	onToggle,
}: AutomationRowProps) {
	const TriggerIcon = AUTOMATION_TRIGGER_ICON[automation.triggerKind];
	const isDimmed = !automation.isActive && !automation.isDraft;

	return (
		// biome-ignore lint/a11y/useSemanticElements: precisa envolver o Switch (um <button> real do Radix) — button-dentro-de-button é inválido, então a linha inteira vira role="button" e o toggle para propagação pra não disparar a seleção
		<div
			role="button"
			tabIndex={0}
			data-automation-item
			onClick={() => onSelect(automation.id)}
			onKeyDown={(event) => {
				if (event.key !== "Enter" && event.key !== " ") return;
				event.preventDefault();
				onSelect(automation.id);
			}}
			aria-current={isSelected}
			className={cn(
				"flex h-11 w-full items-center gap-2 px-3 text-left transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
				isSelected ? "bg-primary/5" : "hover:bg-surface-high",
			)}
		>
			<TriggerIcon
				className={cn(
					"h-3.5 w-3.5 shrink-0",
					automation.isActive && !automation.isDraft
						? "text-primary"
						: "text-muted-foreground",
				)}
			/>

			<span
				className={cn(
					"w-32 shrink-0 truncate text-sm font-medium text-foreground",
					isDimmed && "opacity-60",
				)}
			>
				{automation.name}
			</span>

			<span className="hidden min-w-0 flex-1 truncate text-xs text-muted-foreground sm:block">
				{automation.isDraft
					? "Sem gatilho configurado"
					: automation.triggerSummary}
			</span>

			{automation.isDraft ? (
				<span className="shrink-0 text-xs font-medium text-muted-foreground">
					Incompleta
				</span>
			) : (
				<>
					<span className="shrink-0 text-xs text-muted-foreground">
						{formatRelativeTime(automation.updatedAt ?? automation.createdAt)}
					</span>
					{/** biome-ignore lint/a11y/noStaticElementInteractions: só existe pra isolar o clique do Switch da seleção da linha (stopPropagation) */}
					<span
						className="shrink-0"
						onClick={(event) => event.stopPropagation()}
						onKeyDown={(event) => event.stopPropagation()}
					>
						<Switch
							checked={automation.isActive}
							onCheckedChange={(checked) => onToggle(automation.id, checked)}
							aria-label={`${automation.isActive ? "Desativar" : "Ativar"} automação ${automation.name}`}
							className="scale-90"
						/>
					</span>
				</>
			)}
		</div>
	);
}
