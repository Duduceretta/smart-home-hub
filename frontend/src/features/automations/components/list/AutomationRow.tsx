import { Switch } from "@/core/components/ui/switch";
import { cn } from "@/core/utils";
import { AUTOMATION_TRIGGER_ICON } from "../../constants/automations.constants";
import { formatRelativeTime } from "../../lib/format-relative-time";
import type { AutomationView } from "../../types/automations.types";

interface AutomationRowProps {
	automation: AutomationView;
	isSelected: boolean;
	onSelect: (id: string) => void;
	onToggle: (id: string, nextValue: boolean) => void;
}

/**
 * Linha densa estilo Gmail/tabela — duas linhas por automação (nome+status
 * numa, resumo do gatilho na outra), `px-3 py-2` (não `p-3` do
 * `AutomationCard`) pra ficar visivelmente mais compacta que o modo cards,
 * já que é isso que diferencia os dois modos. Mesma seleção do
 * AutomationCard, só muda a apresentação.
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
				"group flex w-full flex-col gap-0.5 rounded-lg border px-3 py-2 text-left transition-all cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
				isSelected
					? "border-primary/40 bg-primary/10 shadow-xs"
					: "border-transparent bg-surface-container/60 hover:bg-surface-high hover:border-border-subtle/50",
			)}
		>
			<div className="flex items-center gap-2">
				<span
					className={cn(
						"flex h-5 w-5 shrink-0 items-center justify-center rounded-md transition-colors",
						isSelected
							? "bg-primary/15 text-primary"
							: "bg-surface-low text-muted-foreground",
					)}
				>
					<TriggerIcon
						className={cn(
							"h-3 w-3 shrink-0",
							automation.isActive && !automation.isDraft
								? "text-primary"
								: "text-muted-foreground",
						)}
					/>
				</span>

				<span
					className={cn(
						"min-w-0 flex-1 truncate text-sm",
						isSelected
							? "font-semibold text-foreground"
							: "font-medium text-foreground/90 group-hover:text-foreground",
						isDimmed && "opacity-60",
					)}
				>
					{automation.name}
				</span>

				{automation.isDraft ? (
					<span className="shrink-0 rounded-md border border-border-subtle bg-surface-low px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
						Incompleta
					</span>
				) : (
					<div className="flex shrink-0 items-center gap-1.5">
						<span className="text-[11px] text-muted-foreground">
							{formatRelativeTime(automation.updatedAt ?? automation.createdAt)}
						</span>
						{/** biome-ignore lint/a11y/noStaticElementInteractions: só existe pra isolar o clique do Switch da seleção da linha (stopPropagation) */}
						<span
							className="flex h-11 w-11 lg:h-7 lg:w-7 shrink-0 items-center justify-center -mr-2"
							onClick={(event) => event.stopPropagation()}
							onKeyDown={(event) => event.stopPropagation()}
						>
							<Switch
								checked={automation.isActive}
								onCheckedChange={(checked) => onToggle(automation.id, checked)}
								aria-label={`${automation.isActive ? "Desativar" : "Ativar"} automação ${automation.name}`}
								className="scale-75"
							/>
						</span>
					</div>
				)}
			</div>

			<span className="line-clamp-1 pl-7 text-xs text-muted-foreground">
				{automation.isDraft
					? "Sem gatilho configurado"
					: automation.triggerSummary}
			</span>
		</div>
	);
}
