import { Switch } from "@/core/components/ui/switch";
import { cn } from "@/core/utils";
import { AUTOMATION_TRIGGER_ICON } from "../../constants/automations.constants";
import type { AutomationView } from "../../types/automations.types";

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
				"group flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-all cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
				isSelected
					? "border-primary/40 bg-primary/10 shadow-xs"
					: "border-transparent bg-surface-container/60 hover:bg-surface-high hover:border-border-subtle/50",
			)}
		>
			<div
				className={cn(
					"flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-colors",
					automation.isActive && !automation.isDraft
						? "border-primary/30 bg-primary/15 text-primary"
						: "border-border-subtle bg-surface-low text-muted-foreground",
				)}
			>
				<TriggerIcon className="h-4 w-4" />
			</div>

			<div
				className={cn(
					"min-w-0 flex-1 flex flex-col gap-0.5",
					isDimmed && "opacity-60",
				)}
			>
				<div className="flex items-center gap-2">
					<p
						className={cn(
							"truncate text-sm",
							isSelected
								? "font-semibold text-foreground"
								: "font-medium text-foreground/90 group-hover:text-foreground",
						)}
					>
						{automation.name}
					</p>
					{automation.isDraft && (
						<span className="shrink-0 rounded-md border border-border-subtle bg-surface-low px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
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
						className="scale-90"
					/>
				</span>
			)}
		</div>
	);
}
