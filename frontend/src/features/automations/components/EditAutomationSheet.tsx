import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { FormProvider, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useUpdateAutomation } from "../hooks/useUpdateAutomation";
import {
	mapAutomationToFormValues,
	mapFormToRulePayload,
} from "../lib/automation-payload.mapper";
import { useAutomationsUIStore } from "../store/automations-ui.store";
import {
	type AutomationFormInput,
	type AutomationFormOutput,
	updateAutomationSchema,
} from "../types/automation.schemas";
import { ActionsBuilder } from "./ActionsBuilder";
import { AutomationField } from "./AutomationField";
import { AutomationSheetShell } from "./AutomationSheetShell";
import { ConditionsBuilder } from "./ConditionsBuilder";
import { TriggerSection } from "./TriggerSection";

const EMPTY_VALUES: AutomationFormInput = {
	name: "",
	isActive: true,
	triggerType: "time",
	cron: "",
	triggerDeviceId: "",
	triggerStateType: "",
	conditionOperator: "AND",
	rules: [],
	actions: [],
};

export const EditAutomationSheet: React.FC = () => {
	const { t } = useTranslation(["automations", "common"]);
	const { editingAutomation, closeEditSheet } = useAutomationsUIStore();
	const { mutate: updateAutomation, isPending } = useUpdateAutomation();

	const form = useForm<AutomationFormInput, undefined, AutomationFormOutput>({
		resolver: zodResolver(updateAutomationSchema),
		mode: "onSubmit",
		reValidateMode: "onChange",
		values: editingAutomation
			? mapAutomationToFormValues(editingAutomation)
			: EMPTY_VALUES,
	});

	const {
		register,
		handleSubmit,
		formState: { errors },
	} = form;

	const onSubmit = (data: AutomationFormOutput) => {
		if (!editingAutomation) return;

		updateAutomation(
			{
				id: editingAutomation.id,
				payload: {
					name: data.name,
					isActive: data.isActive,
					rulePayload: JSON.stringify(mapFormToRulePayload(data)),
				},
			},
			{
				onSuccess: () => closeEditSheet(),
			},
		);
	};

	return (
		<FormProvider {...form}>
			<AutomationSheetShell
				isOpen={Boolean(editingAutomation)}
				onClose={closeEditSheet}
				onSubmit={handleSubmit(onSubmit)}
				title={t("form.edit.title")}
				description={t("form.edit.description")}
				footer={
					<>
						<button
							type="button"
							onClick={closeEditSheet}
							disabled={isPending}
							className="rounded-md border border-border-subtle/30 bg-transparent px-4 py-2 text-xs font-medium text-muted-foreground transition-colors hover:border-border-subtle/50 hover:text-foreground disabled:opacity-50 cursor-pointer"
						>
							{t("common:actions.cancel")}
						</button>
						<button
							type="submit"
							disabled={isPending}
							className="relative inline-flex items-center gap-2 overflow-hidden rounded-md bg-primary px-6 py-2 text-xs font-medium text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
						>
							{isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
							{t("form.edit.submitButton")}
						</button>
					</>
				}
			>
				<div className="space-y-6">
					<AutomationField
						id="edit-name"
						label={t("form.fields.name.label")}
						error={errors.name?.message}
					>
						<input
							id="edit-name"
							type="text"
							placeholder={t("form.fields.name.placeholder")}
							className="w-full rounded-lg border border-border-subtle/20 bg-surface-container px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-primary/50 focus:ring-1 focus:ring-primary/50"
							{...register("name")}
						/>
					</AutomationField>

					<label className="flex items-center justify-between rounded-lg border border-border-subtle/20 bg-surface-container px-3 py-2.5">
						<span className="text-xs font-medium text-foreground">
							{t("form.fields.isActive.label")}
						</span>
						<input
							type="checkbox"
							className="h-4 w-4 accent-primary cursor-pointer"
							{...register("isActive")}
						/>
					</label>

					<TriggerSection />
					<ConditionsBuilder />
					<ActionsBuilder />
				</div>
			</AutomationSheetShell>
		</FormProvider>
	);
};
