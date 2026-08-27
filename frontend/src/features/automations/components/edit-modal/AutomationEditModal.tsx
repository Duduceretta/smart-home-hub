import { Loader2, Pencil } from "lucide-react";
import { useEffect, useRef } from "react";
import { FormGlobalError } from "@/core/components/forms/FormGlobalError";
import { Button } from "@/core/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/core/components/ui/dialog";
import { Switch } from "@/core/components/ui/switch";
import { TRIGGER_SOURCE_OPTIONS } from "../../constants/automations.constants";
import { useEditAutomationForm } from "../../hooks/useEditAutomationForm";
import { usePickerDevices } from "../../hooks/usePickerDevices";
import { useUpdateAutomation } from "../../hooks/useUpdateAutomation";
import { mapFormStateToUpdatePayload } from "../../lib/automation-wizard-payload.mapper";
import { useAutomationsUIStore } from "../../store/automations-ui.store";
import { ActionsStep } from "../automation-form/ActionsStep";
import { TriggerConfigStep } from "../automation-form/TriggerConfigStep";

function FormSection({
	title,
	children,
}: {
	title: string;
	children: React.ReactNode;
}) {
	return (
		<div className="flex flex-col gap-2">
			<h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
				{title}
			</h3>
			{children}
		</div>
	);
}

/**
 * Formulário único de edição (sem stepper, sem Voltar/Próximo) — mesma
 * estrutura do EditDeviceModal: header fixo, corpo com scroll interno
 * (`flex-1 overflow-y-auto`), rodapé fixo com Cancelar/Salvar. Reaproveita
 * `TriggerConfigStep`/`ActionsStep` do wizard de criação (mesmos
 * componentes, sem navegação por passo aqui) via `useEditAutomationForm`,
 * que compartilha o reducer do wizard (`automation-form-reducer.ts`).
 *
 * O tipo de gatilho (Sensor/Dispositivo/Localização/Horário) fica fixo —
 * só é exibido, não editável: trocar de tipo depois de criada exigiria
 * descartar toda a configuração/condição já montada, e o produto decidiu
 * não expor essa troca aqui (crie uma nova automação nesse caso).
 */
export function AutomationEditModal() {
	const editingAutomation = useAutomationsUIStore((s) => s.editingAutomation);
	const closeEditModal = useAutomationsUIStore((s) => s.closeEditModal);
	const isOpen = Boolean(editingAutomation);

	const form = useEditAutomationForm(editingAutomation);
	const { data: devices = [], isLoading: isLoadingDevices } =
		usePickerDevices();
	const updateAutomation = useUpdateAutomation();

	const nameInputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (isOpen) nameInputRef.current?.focus();
	}, [isOpen]);

	const handleClose = () => {
		if (form.hasChanges) {
			const confirmed = confirm(
				"Descartar as alterações feitas nessa automação?",
			);
			if (!confirmed) return;
		}
		closeEditModal();
	};

	const handleSubmit = () => {
		if (!editingAutomation) return;
		const payload = mapFormStateToUpdatePayload(form.state);
		updateAutomation.mutate(
			{ id: editingAutomation.id, payload },
			{ onSuccess: () => closeEditModal() },
		);
	};

	const triggerSourceOption = TRIGGER_SOURCE_OPTIONS.find(
		(option) => option.value === form.state.triggerSource,
	);
	const TriggerIcon = triggerSourceOption?.icon;

	const isSaveDisabled =
		!form.hasChanges ||
		!form.isTriggerConfigValid ||
		!form.isActionsListValid ||
		form.state.name.trim().length === 0 ||
		updateAutomation.isPending;

	return (
		<Dialog
			open={isOpen}
			onOpenChange={(open) => {
				if (!open) handleClose();
			}}
		>
			<DialogContent className="gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-2xl">
				<div className="flex max-h-[85vh] flex-col">
					<div className="flex items-start gap-4 border-b border-border-subtle/20 p-6 pb-4">
						<span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/30">
							<Pencil className="h-5 w-5" />
						</span>
						<DialogHeader className="gap-1">
							<DialogTitle className="text-lg">Editar Automação</DialogTitle>
							<DialogDescription className="text-xs">
								Ajuste o gatilho, as ações ou o status dessa automação.
							</DialogDescription>
						</DialogHeader>
					</div>

					<div className="relative min-h-0 flex-1">
						<div className="h-full overflow-y-auto p-6">
							<div className="flex flex-col gap-6">
								<FormGlobalError error={updateAutomation.error?.message} />

								<FormSection title="Nome da automação">
									<input
										id="automation-name"
										ref={nameInputRef}
										type="text"
										value={form.state.name}
										onChange={(event) => form.setName(event.target.value)}
										placeholder="Ex: Desligar tudo à noite"
										maxLength={150}
										className="h-8 w-full rounded-lg border border-border-subtle/20 bg-surface-high px-3 text-sm text-foreground outline-none transition-colors focus:border-primary/50 focus:ring-1 focus:ring-primary/50"
									/>
								</FormSection>

								<FormSection title="Gatilho">
									{/* Tipo fixo — só exibição, sem interação (ver docblock do
								componente pra motivo). */}
									{triggerSourceOption && TriggerIcon && (
										<div className="flex items-center gap-4 rounded-lg border border-border-subtle/20 bg-surface-high p-4">
											<span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
												<TriggerIcon className="h-4 w-4" />
											</span>
											<div className="min-w-0">
												<p className="text-sm font-medium text-foreground">
													{triggerSourceOption.label}
												</p>
												<p className="text-sm text-muted-foreground">
													O tipo de gatilho não pode ser alterado depois de
													criado.
												</p>
											</div>
										</div>
									)}

									{form.state.triggerSource ? (
										<TriggerConfigStep
											form={form}
											devices={devices}
											isLoadingDevices={isLoadingDevices}
										/>
									) : (
										<p className="rounded-lg border border-dashed border-alert/40 bg-alert/10 p-4 text-xs text-alert-foreground">
											Não foi possível interpretar a configuração de gatilho
											dessa automação.
										</p>
									)}
								</FormSection>

								<FormSection title="Ações">
									<ActionsStep
										form={form}
										devices={devices}
										isLoadingDevices={isLoadingDevices}
									/>
								</FormSection>

								<FormSection title="Status">
									<div className="flex items-center justify-between rounded-lg border border-border-subtle/20 bg-surface-high p-4">
										<div>
											<p className="text-sm font-medium text-foreground">
												Ativa
											</p>
											<p className="text-sm text-muted-foreground">
												Se desligado, a automação fica salva mas pausada.
											</p>
										</div>
										<Switch
											checked={form.state.activateImmediately}
											onCheckedChange={form.setActivateImmediately}
											aria-label="Automação ativa"
										/>
									</div>
								</FormSection>
							</div>
						</div>
						<div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-popover to-transparent" />
					</div>

					<div className="flex items-center justify-end gap-2 border-t border-border-subtle/20 bg-surface-low p-4">
						<Button
							type="button"
							variant="outline"
							onClick={handleClose}
							disabled={updateAutomation.isPending}
						>
							Cancelar
						</Button>
						<Button
							type="button"
							onClick={handleSubmit}
							disabled={isSaveDisabled}
						>
							{updateAutomation.isPending && (
								<Loader2 className="h-3.5 w-3.5 animate-spin" />
							)}
							Salvar Alterações
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
