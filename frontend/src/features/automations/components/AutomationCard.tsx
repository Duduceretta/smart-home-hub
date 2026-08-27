import { Switch } from "@/core/components/ui/switch";
import { cn } from "@/core/utils";
import { AUTOMATION_TRIGGER_ICON } from "../constants/automations.constants";
import type { AutomationView } from "../types/automations.types";

interface AutomationCardProps {
	automation: AutomationView;
	isSelected: boolean;
	onSelect: (id: string) => void;
	onToggle: (id: string, nextValue: boolean) => void;
}

/**
 * Item compacto da coluna esquerda (modo Cards) — o toggle ativar/desativar
 * mora aqui também (além do painel de detalhe), sincronizado pelo mesmo
 * estado do pai. O card só seleciona ao clicar fora do toggle.
 */
export function AutomationCard({
	automation,
	isSelected,
	onSelect,
	onToggle,
}: AutomationCardProps) {
	const TriggerIcon = AUTOMATION_TRIGGER_ICON[automation.triggerKind];
	const isDimmed = !automation.isActive && !automation.isDraft;

	return (
		// biome-ignore lint/a11y/useSemanticElements: precisa envolver o Switch (um <button> real do Radix) — button-dentro-de-button é inválido, então o card vira role="button" e o toggle para propagação pra não disparar a seleção
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
				"flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
				isSelected
					? "border-primary/40 bg-primary/5"
					: "border-border-subtle/20 bg-surface-container hover:border-primary/25",
			)}
		>
			<div
				className={cn(
					"flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
					automation.isActive && !automation.isDraft
						? "bg-primary/15 text-primary"
						: "bg-muted text-muted-foreground",
				)}
			>
				<TriggerIcon className="h-4 w-4" />
			</div>

			<div className={cn("min-w-0 flex-1", isDimmed && "opacity-60")}>
				<div className="flex items-center gap-1.5">
					<p className="truncate text-sm font-medium text-foreground">
						{automation.name}
					</p>
					{automation.isDraft && (
						<span className="shrink-0 rounded-full border border-border-subtle/40 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
							Incompleta
						</span>
					)}
				</div>
				<p className="truncate text-xs text-muted-foreground">
					{automation.triggerSummary}
				</p>
			</div>

			{!automation.isDraft && (
				// biome-ignore lint/a11y/noStaticElementInteractions: só existe pra isolar o clique do Switch da seleção do card (stopPropagation)
				<span
					className="shrink-0"
					onClick={(event) => event.stopPropagation()}
					onKeyDown={(event) => event.stopPropagation()}
				>
					<Switch
						checked={automation.isActive}
						onCheckedChange={(checked) => onToggle(automation.id, checked)}
						aria-label={`${automation.isActive ? "Desativar" : "Ativar"} automação ${automation.name}`}
					/>
				</span>
			)}
		</div>
	);
}
