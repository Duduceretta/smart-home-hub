import { ArrowLeft, Trash2 } from "lucide-react";
import { useConfirm } from "@/core/components/providers/ConfirmDialogProvider";
import { AUTOMATION_TRIGGER_ICON } from "../../constants/automations.constants";
import type { AutomationView } from "../../types/automations.types";
import { AutomationDetailContent } from "./AutomationDetailContent";
import { AutomationDetailHeader } from "./AutomationDetailHeader";

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
			<div className="flex h-full max-h-full min-h-50 flex-col items-center justify-center rounded-xl border border-dashed border-border-subtle bg-surface-low p-6 text-center">
				<button
					type="button"
					onClick={onBack}
					className="mb-4 inline-flex h-11 items-center gap-1.5 rounded-lg border border-border-subtle bg-surface-container px-3 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground cursor-pointer lg:hidden"
				>
					<ArrowLeft className="h-4 w-4" />
					Voltar para lista
				</button>
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
			<AutomationDetailHeader
				automation={automation}
				triggerIcon={TriggerIcon}
				onBack={onBack}
				onToggle={onToggle}
				onEdit={onEdit}
				onDuplicate={onDuplicate}
				onDelete={handleDelete}
			/>

			<AutomationDetailContent
				automation={automation}
				triggerIcon={TriggerIcon}
			/>
		</div>
	);
}
