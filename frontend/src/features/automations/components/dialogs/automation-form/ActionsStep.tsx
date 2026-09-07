import { Pencil, Plus, Trash2, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/core/components/ui/button";
import { Label } from "@/core/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/core/components/ui/select";
import { cn } from "@/core/utils";
import type { AutomationFormController } from "../../../types/automation-wizard.types";
import type { PickerDevice } from "../../../types/automations.types";

interface ActionsStepProps {
	form: AutomationFormController;
	devices: PickerDevice[];
	isLoadingDevices: boolean;
}

interface ActionDraft {
	deviceId: string;
	desiredState: boolean;
}

const EMPTY_DRAFT: ActionDraft = { deviceId: "", desiredState: true };

/**
 * Lista de ações + sub-formulário de adicionar/editar — usado tanto no
 * Passo 3 do wizard de criação quanto inline na seção "Ações" do
 * formulário de edição. O `AutomationAction` real só tem `deviceId` +
 * `desiredState` (booleano) — sem intensidade/cor/cena, porque é isso que
 * o backend aceita hoje (ver AutomationRules.cs). O rascunho da ação sendo
 * criada/editada é estado local deste componente (não precisa sobreviver a
 * nada externo); a LISTA de ações já salvas mora no reducer compartilhado.
 */
export function ActionsStep({
	form,
	devices,
	isLoadingDevices,
}: ActionsStepProps) {
	const { t } = useTranslation("automations");
	const { state, addOrUpdateAction, editAction, removeAction } = form;
	const [isAdding, setIsAdding] = useState(false);
	const [draft, setDraft] = useState<ActionDraft>(EMPTY_DRAFT);

	const editingAction = state.actions.find(
		(a) => a.id === state.editingActionId,
	);

	useEffect(() => {
		if (editingAction) {
			setDraft({
				deviceId: editingAction.deviceId,
				desiredState: editingAction.desiredState,
			});
			setIsAdding(true);
		}
	}, [editingAction]);

	const closeForm = () => {
		setIsAdding(false);
		setDraft(EMPTY_DRAFT);
		editAction(null);
	};

	const handleSave = () => {
		if (!draft.deviceId) return;
		addOrUpdateAction({
			id: state.editingActionId ?? crypto.randomUUID(),
			deviceId: draft.deviceId,
			desiredState: draft.desiredState,
		});
		closeForm();
	};

	const deviceName = (deviceId: string) =>
		devices.find((d) => d.id === deviceId)?.name ??
		t("wizard.actionsStep.deviceRemoved");

	return (
		<div className="flex flex-1 flex-col gap-4">
			<div>
				<h2 className="text-lg font-medium text-foreground">
					{t("wizard.actionsStep.title")}
				</h2>
				<p className="mt-0.5 text-sm text-muted-foreground">
					{t("wizard.actionsStep.subtitle")}
				</p>
			</div>

			{state.actions.length > 0 && (
				<ul className="flex flex-col gap-2">
					{state.actions.map((action) => (
						<li
							key={action.id}
							className="flex items-center gap-4 rounded-lg border border-border-subtle bg-surface-high p-4"
						>
							<span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
								<Zap className="h-4 w-4" />
							</span>
							<div className="min-w-0 flex-1">
								<p className="truncate text-sm font-medium text-foreground">
									{action.desiredState
										? t("wizard.actionsStep.on")
										: t("wizard.actionsStep.off")}{" "}
									{deviceName(action.deviceId)}
								</p>
							</div>
							<Button
								type="button"
								variant="ghost"
								size="icon"
								className="h-11 w-11 sm:h-8 sm:w-8"
								onClick={() => editAction(action.id)}
								aria-label={t("wizard.actionsStep.editActionAria", {
									device: deviceName(action.deviceId),
								})}
							>
								<Pencil className="h-3.5 w-3.5" />
							</Button>
							<Button
								type="button"
								variant="ghost"
								size="icon"
								className="h-11 w-11 sm:h-8 sm:w-8"
								onClick={() => removeAction(action.id)}
								aria-label={t("wizard.actionsStep.removeActionAria", {
									device: deviceName(action.deviceId),
								})}
							>
								<Trash2 className="h-3.5 w-3.5" />
							</Button>
						</li>
					))}
				</ul>
			)}

			{isAdding ? (
				<div className="flex flex-col gap-4 rounded-lg border border-border-subtle bg-surface-high p-4">
					<div className="flex flex-col gap-1.5">
						<Label>{t("wizard.actionsStep.deviceLabel")}</Label>
						{isLoadingDevices ? (
							<div
								role="status"
								aria-busy="true"
								className="h-11 sm:h-9 w-full rounded-lg bg-surface-container animate-pulse"
							>
								<span className="sr-only">
									{t("wizard.actionsStep.loading")}
								</span>
							</div>
						) : (
							<Select
								value={draft.deviceId || undefined}
								onValueChange={(deviceId) =>
									setDraft((prev) => ({ ...prev, deviceId }))
								}
							>
								<SelectTrigger className="h-11 sm:h-9 w-full">
									<SelectValue
										placeholder={t(
											"wizard.actionsStep.selectDevicePlaceholder",
										)}
									/>
								</SelectTrigger>
								<SelectContent>
									{devices.map((device) => (
										<SelectItem key={device.id} value={device.id}>
											{device.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						)}
					</div>

					<div className="flex flex-col gap-1.5">
						<Label>{t("wizard.actionsStep.stateLabel")}</Label>
						<div className="grid grid-cols-2 gap-2">
							<button
								type="button"
								aria-pressed={draft.desiredState}
								onClick={() =>
									setDraft((prev) => ({ ...prev, desiredState: true }))
								}
								className={cn(
									"h-11 sm:h-8.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors cursor-pointer",
									draft.desiredState
										? "border-primary/40 bg-primary/10 text-primary"
										: "border-border-subtle bg-surface-low text-muted-foreground hover:text-foreground",
								)}
							>
								{t("wizard.actionsStep.on")}
							</button>
							<button
								type="button"
								aria-pressed={!draft.desiredState}
								onClick={() =>
									setDraft((prev) => ({ ...prev, desiredState: false }))
								}
								className={cn(
									"h-11 sm:h-8.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors cursor-pointer",
									!draft.desiredState
										? "border-primary/40 bg-primary/10 text-primary"
										: "border-border-subtle bg-surface-low text-muted-foreground hover:text-foreground",
								)}
							>
								{t("wizard.actionsStep.off")}
							</button>
						</div>
					</div>

					<div className="flex items-center justify-end gap-2">
						<Button
							type="button"
							variant="ghost"
							size="sm"
							className="h-11 sm:h-9"
							onClick={closeForm}
						>
							{t("wizard.actionsStep.cancel")}
						</Button>
						<Button
							type="button"
							size="sm"
							className="h-11 sm:h-9"
							disabled={!draft.deviceId}
							onClick={handleSave}
						>
							{state.editingActionId
								? t("wizard.actionsStep.saveAction")
								: t("wizard.actionsStep.add")}
						</Button>
					</div>
				</div>
			) : (
				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={() => setIsAdding(true)}
					className="h-11 sm:h-9 w-full sm:w-fit"
				>
					<Plus className="h-3.5 w-3.5" />
					{t("wizard.actionsStep.addAction")}
				</Button>
			)}
		</div>
	);
}
