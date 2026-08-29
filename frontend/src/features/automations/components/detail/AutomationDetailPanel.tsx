import {
	AlertTriangle,
	ArrowDown,
	ArrowLeft,
	Copy,
	Pencil,
	Trash2,
	Zap,
} from "lucide-react";
import { useConfirm } from "@/core/components/providers/ConfirmDialogProvider";
import { Button } from "@/core/components/ui/button";
import { Switch } from "@/core/components/ui/switch";
import { cn } from "@/core/utils";
import { AUTOMATION_TRIGGER_ICON } from "../../constants/automations.constants";
import { formatRelativeTime } from "../../lib/format-relative-time";
import type { AutomationView } from "../../types/automations.types";
import { AutomationExecutionSection } from "./AutomationExecutionSection";

interface AutomationDetailPanelProps {
	automation: AutomationView | null;
	onBack: () => void;
	onToggle: (id: string, nextValue: boolean) => void;
	onEdit: (automation: AutomationView) => void;
	onDuplicate: (automation: AutomationView) => void;
	onDelete: (id: string) => void;
}

/**
 * Painel fixo da coluna direita — não é mais Sheet/overlay. `onBack` só
 * aparece em telas <lg (className `lg:hidden`): em split-view real o
 * usuário nunca "sai" do detalhe, só troca a seleção na lista.
 */
export function AutomationDetailPanel({
	automation,
	onBack,
	onToggle,
	onEdit,
	onDuplicate,
	onDelete,
}: AutomationDetailPanelProps) {
	const confirm = useConfirm();

	if (!automation) {
		return (
			<div className="flex h-full max-h-full min-h-50 flex-col items-center justify-center rounded-xl border border-dashed border-border-subtle bg-surface-low text-center">
				<p className="text-sm text-muted-foreground">
					Selecione uma automação pra ver os detalhes.
				</p>
			</div>
		);
	}

	const TriggerIcon = AUTOMATION_TRIGGER_ICON[automation.triggerKind];

	const handleDelete = async () => {
		const confirmed = await confirm({
			title: "Excluir automação?",
			description: `Tem certeza que deseja excluir a automação "${automation.name}"? Essa ação não pode ser desfeita.`,
			confirmLabel: "Excluir",
			variant: "destructive",
			icon: Trash2,
		});
		if (confirmed) onDelete(automation.id);
	};

	return (
		<div className="flex h-full max-h-full flex-col overflow-hidden rounded-xl border border-border-subtle bg-surface-low shadow-sm">
			{/* Cabeçalho de Detalhes: Nome, Status, Toggle e Ações */}
			<div className="flex shrink-0 flex-col gap-4 border-b border-border-subtle/50 bg-surface-container/50 p-6">
				<button
					type="button"
					onClick={onBack}
					className="inline-flex w-fit items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground cursor-pointer lg:hidden"
				>
					<ArrowLeft className="h-3.5 w-3.5" />
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
						<Switch
							checked={automation.isActive}
							onCheckedChange={(checked) => onToggle(automation.id, checked)}
							aria-label={`${automation.isActive ? "Desativar" : "Ativar"} automação ${automation.name}`}
							className="shrink-0"
						/>
					)}
				</div>

				<div className="flex items-center gap-2 pt-1">
					<Button
						variant="outline"
						size="sm"
						onClick={() => onEdit(automation)}
						className="border-border-subtle bg-surface-container text-foreground hover:bg-surface-high hover:border-primary/40 cursor-pointer"
					>
						<Pencil className="h-3.5 w-3.5 mr-1" />
						Editar
					</Button>
					<Button
						variant="outline"
						size="sm"
						onClick={() => onDuplicate(automation)}
						className="border-border-subtle bg-surface-container text-foreground hover:bg-surface-high hover:border-primary/40 cursor-pointer"
					>
						<Copy className="h-3.5 w-3.5 mr-1" />
						Duplicar
					</Button>
					<Button
						variant="outline"
						size="sm"
						onClick={handleDelete}
						className="ml-auto border-destructive/30 bg-destructive/10 text-xs font-semibold text-destructive transition-all hover:bg-destructive/20 hover:border-destructive/40 cursor-pointer shadow-xs"
					>
						<Trash2 className="h-3.5 w-3.5 mr-1" />
						Excluir
					</Button>
				</div>
			</div>

			{/* Corpo de Detalhes com Scroll sem gradiente fixo */}
			<div className="relative min-h-0 flex-1">
				<div className="h-full overflow-y-auto p-5 scrollbar-gutter-stable scrollbar-thin">
					<div key={automation.id} className="space-y-4 animate-fade-in">
						{/* Bloco Gatilho */}
						<div className="rounded-lg border border-border-subtle/20 bg-surface-container p-4">
							<div className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
								<TriggerIcon className="h-3.5 w-3.5" />
								Gatilho
							</div>
							<p className="text-sm font-medium text-foreground">
								{automation.triggerSummary}
							</p>
						</div>

						{/* Bloco Condição (opcional) */}
						{automation.conditionSummary && (
							<>
								<ArrowDown className="mx-auto h-4 w-4 text-muted-foreground/60" />
								<div className="rounded-lg border border-border-subtle/20 bg-surface-container p-4">
									<div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
										Condição
									</div>
									<p className="text-sm font-medium text-foreground">
										{automation.conditionSummary}
									</p>
								</div>
							</>
						)}

						<ArrowDown className="mx-auto h-4 w-4 text-muted-foreground/60" />

						{/* Bloco Ações */}
						<div className="rounded-lg border border-border-subtle/20 bg-surface-container p-4">
							<div className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
								<Zap className="h-3.5 w-3.5" />
								Ações
							</div>
							{automation.actionSummaries.length === 0 ? (
								<p className="text-xs text-muted-foreground">
									Nenhuma ação configurada ainda.
								</p>
							) : (
								<ul className="space-y-1.5">
									{automation.actionSummaries.map((action) => (
										<li
											key={action}
											className="text-sm font-medium text-foreground"
										>
											• {action}
										</li>
									))}
								</ul>
							)}
						</div>

						{/* Grid de Metadados: Criada, Atualizada, Última Execução */}
						<div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
							<div className="rounded-lg border border-border-subtle/20 bg-surface-container p-3.5">
								<div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
									Criada
								</div>
								<p className="text-xs font-medium text-foreground">
									{formatRelativeTime(automation.createdAt)}
								</p>
							</div>
							<div className="rounded-lg border border-border-subtle/20 bg-surface-container p-3.5">
								<div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
									Atualizada
								</div>
								<p className="text-xs font-medium text-foreground">
									{automation.updatedAt
										? formatRelativeTime(automation.updatedAt)
										: "Nunca"}
								</p>
							</div>
							<div className="rounded-lg border border-border-subtle/20 bg-surface-container p-3.5">
								<div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
									Última execução
								</div>
								<p className="text-xs font-medium text-foreground">
									{formatRelativeTime(automation.lastExecutedAt)}
								</p>
							</div>
						</div>

						{/* Seção de Gráficos e Histórico */}
						<AutomationExecutionSection automationId={automation.id} />
					</div>
				</div>
			</div>
		</div>
	);
}
