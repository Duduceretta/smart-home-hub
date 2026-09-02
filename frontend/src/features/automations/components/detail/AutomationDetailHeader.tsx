import { AlertTriangle, ArrowLeft, Copy, Pencil, Trash2 } from "lucide-react";
import type { ComponentType } from "react";
import { Button } from "@/core/components/ui/button";
import { Switch } from "@/core/components/ui/switch";
import { cn } from "@/core/utils";
import type { AutomationView } from "../../types/automations.types";

interface AutomationDetailHeaderProps {
	automation: AutomationView;
	triggerIcon: ComponentType<{ className?: string }>;
	onBack: () => void;
	onToggle: (id: string, nextValue: boolean) => void;
	onEdit: (automation: AutomationView) => void;
	onDuplicate: (automation: AutomationView) => void;
	onDelete: () => void;
}

/**
 * Cabeçalho do painel de detalhe: link de voltar (só <lg), ícone/nome/status
 * com toggle, e a barra de ações (editar/duplicar/excluir).
 */
export function AutomationDetailHeader({
	automation,
	triggerIcon: TriggerIcon,
	onBack,
	onToggle,
	onEdit,
	onDuplicate,
	onDelete,
}: AutomationDetailHeaderProps) {
	return (
		<div className="flex shrink-0 flex-col gap-4 border-b border-border-subtle/50 pb-4 lg:bg-surface-container/50 lg:p-6">
			<button
				type="button"
				onClick={onBack}
				className="inline-flex h-11 w-fit items-center gap-1.5 -ml-2 px-2 rounded-lg text-xs font-medium text-muted-foreground transition-colors hover:bg-surface-high hover:text-foreground cursor-pointer lg:hidden"
			>
				<ArrowLeft className="h-4 w-4" />
				Voltar
			</button>

			<div className="flex items-start justify-between gap-4">
				<div className="flex min-w-0 items-center gap-3.5">
					<div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-surface-high text-primary shadow-xs">
						<TriggerIcon className="h-6 w-6" />
					</div>
					<div className="min-w-0">
						<h2 className="truncate text-xl font-semibold tracking-tight text-foreground">
							{automation.name}
						</h2>
						<div className="flex items-center gap-2 mt-0.5">
							<span
								className={cn(
									"text-xs font-semibold uppercase tracking-wider",
									automation.isDraft
										? "text-muted-foreground"
										: automation.isActive
											? "text-primary"
											: "text-muted-foreground",
								)}
							>
								{automation.isDraft
									? "Incompleta"
									: automation.isActive
										? "Ativa"
										: "Inativa"}
							</span>

							{automation.hasFailedToday && (
								<span className="inline-flex items-center gap-1 rounded-md border border-destructive/30 bg-destructive/10 px-2 py-0.5 text-[11px] font-semibold text-destructive">
									<AlertTriangle className="h-3 w-3" />
									Falhou hoje
								</span>
							)}
						</div>
					</div>
				</div>

				{!automation.isDraft && (
					<div className="flex h-11 items-center shrink-0">
						<Switch
							checked={automation.isActive}
							onCheckedChange={(checked) => onToggle(automation.id, checked)}
							aria-label={`${automation.isActive ? "Desativar" : "Ativar"} automação ${automation.name}`}
							className="shrink-0"
						/>
					</div>
				)}
			</div>

			<div className="flex items-center gap-2 pt-1">
				<Button
					variant="outline"
					size="sm"
					onClick={() => onEdit(automation)}
					className="h-11 lg:h-8 border-border-subtle bg-surface-container text-foreground hover:bg-surface-high hover:border-primary/40 cursor-pointer"
				>
					<Pencil className="h-3.5 w-3.5 mr-1" />
					Editar
				</Button>
				<Button
					variant="outline"
					size="sm"
					onClick={() => onDuplicate(automation)}
					className="h-11 lg:h-8 border-border-subtle bg-surface-container text-foreground hover:bg-surface-high hover:border-primary/40 cursor-pointer"
				>
					<Copy className="h-3.5 w-3.5 mr-1" />
					Duplicar
				</Button>
				<Button
					variant="outline"
					size="sm"
					onClick={onDelete}
					className="ml-auto h-11 lg:h-8 border-destructive/30 bg-destructive/10 text-xs font-semibold text-destructive transition-all hover:bg-destructive/20 hover:border-destructive/40 cursor-pointer shadow-xs"
				>
					<Trash2 className="h-3.5 w-3.5 mr-1" />
					Excluir
				</Button>
			</div>
		</div>
	);
}

