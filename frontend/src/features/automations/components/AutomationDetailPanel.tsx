import { ArrowDown, ArrowLeft, Copy, Pencil, Trash2, Zap } from "lucide-react";
import { Button } from "@/core/components/ui/button";
import { Switch } from "@/core/components/ui/switch";
import { cn } from "@/core/utils";
import { AUTOMATION_TRIGGER_ICON } from "../constants/automations.constants";
import { formatRelativeTime } from "../lib/format-relative-time";
import type { AutomationView } from "../types/automations.types";

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
	if (!automation) {
		return (
			<div className="flex h-full max-h-full min-h-[200px] flex-col items-center justify-center rounded-xl border border-dashed border-border-subtle/40 bg-surface-low text-center">
				<p className="text-sm text-muted-foreground">
					Selecione uma automação pra ver os detalhes.
				</p>
				<div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-surface-low to-transparent" />
			</div>
		);
	}

	const TriggerIcon = AUTOMATION_TRIGGER_ICON[automation.triggerKind];

	const handleDelete = () => {
		if (
			confirm(
				`Tem certeza que deseja excluir a automação "${automation.name}"?`,
			)
		) {
			onDelete(automation.id);
		}
	};

	return (
		<div className="flex h-full max-h-full flex-col overflow-hidden rounded-xl border border-border-subtle/20 bg-surface-low">
			<div className="flex shrink-0 flex-col gap-4 border-b border-border-subtle/20 p-6">
				<button
					type="button"
					onClick={onBack}
					className="inline-flex w-fit items-center gap-1 text-xs text-muted-foreground hover:text-foreground cursor-pointer lg:hidden"
				>
					<ArrowLeft className="h-3.5 w-3.5" />
					Voltar
				</button>

				<div className="flex items-start justify-between gap-4">
					<div className="flex min-w-0 items-center gap-4">
						<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-high text-primary">
							<TriggerIcon className="h-4.5 w-4.5" />
						</div>
						<div className="min-w-0">
							<h2 className="truncate text-lg font-medium text-foreground">
								{automation.name}
							</h2>
							<span
								className={cn(
									"text-xs font-medium uppercase tracking-wider",
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

				<div className="flex items-center gap-2">
					<Button
						variant="outline"
						size="sm"
						onClick={() => onEdit(automation)}
					>
						<Pencil className="h-3.5 w-3.5" />
						Editar
					</Button>
					<Button
						variant="outline"
						size="sm"
						onClick={() => onDuplicate(automation)}
					>
						<Copy className="h-3.5 w-3.5" />
						Duplicar
					</Button>
					<Button
						variant="destructive"
						size="sm"
						onClick={handleDelete}
						className="ml-auto"
					>
						<Trash2 className="h-3.5 w-3.5" />
						Excluir
					</Button>
				</div>
			</div>

			{/* scrollbar-gutter:stable reserva o espaço da barra mesmo quando
			o conteúdo não excede a altura — sem isso, trocar de automação
			fazia a largura do conteúdo "pular". animate-fade-in (keyframe
			própria, mesma família do fade do AuthLayout/sheet) em vez de
			animate-in do tw-animate-css: esta última pisca porque começa
			visível por um frame antes de aplicar opacity 0. */}
			<div className="relative min-h-0 flex-1">
				<div className="h-full overflow-y-auto p-6 [scrollbar-gutter:stable] scrollbar-thin">
					<div key={automation.id} className="space-y-6 animate-fade-in">
						<div className="rounded-lg border border-border-subtle/20 bg-surface-container p-4">
							<div className="mb-2 flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
								<TriggerIcon className="h-3 w-3" />
								Gatilho
							</div>
							<p className="text-sm text-foreground">
								{automation.triggerSummary}
							</p>
						</div>

						{automation.conditionSummary && (
							<>
								<ArrowDown className="mx-auto h-4 w-4 text-border-subtle" />
								<div className="rounded-lg border border-border-subtle/20 bg-surface-container p-4">
									<div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
										Condição
									</div>
									<p className="text-sm text-foreground">
										{automation.conditionSummary}
									</p>
								</div>
							</>
						)}

						<ArrowDown className="mx-auto h-4 w-4 text-border-subtle" />

						<div className="rounded-lg border border-border-subtle/20 bg-surface-container p-4">
							<div className="mb-2 flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
								<Zap className="h-3 w-3" />
								Ações
							</div>
							{automation.actionSummaries.length === 0 ? (
								<p className="text-sm text-muted-foreground">
									Nenhuma ação configurada ainda.
								</p>
							) : (
								<ul className="space-y-1">
									{automation.actionSummaries.map((action) => (
										<li key={action} className="text-sm text-foreground">
											• {action}
										</li>
									))}
								</ul>
							)}
						</div>

						{/* Sem histórico de execução: o backend ainda não rastreia
					quando/se uma automação disparou (não existe telemetria de
					execução hoje, só de dispositivos) — em vez de fingir esse
					dado, mostramos os metadados reais que a API já retorna. */}
						<div className="grid grid-cols-2 gap-4">
							<div className="rounded-lg border border-border-subtle/20 bg-surface-container p-4">
								<div className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
									Criada
								</div>
								<p className="text-sm text-foreground">
									{formatRelativeTime(automation.createdAt)}
								</p>
							</div>
							<div className="rounded-lg border border-border-subtle/20 bg-surface-container p-4">
								<div className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
									Atualizada
								</div>
								<p className="text-sm text-foreground">
									{automation.updatedAt
										? formatRelativeTime(automation.updatedAt)
										: "Nunca"}
								</p>
							</div>
						</div>
					</div>
				</div>
				<div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-surface-low to-transparent" />
			</div>
		</div>
	);
}
