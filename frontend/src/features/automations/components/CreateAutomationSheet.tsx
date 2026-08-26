import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useCreateAutomation } from "../hooks/useCreateAutomation";
import { mapFormToRulePayload } from "../lib/automation-payload.mapper";
import { useAutomationsUIStore } from "../store/automations-ui.store";
import {
	type AutomationFormInput,
	type AutomationFormOutput,
	createAutomationSchema,
} from "../types/automation.schemas";
import { ActionsBuilder } from "./ActionsBuilder";
import { AutomationField } from "./AutomationField";
import { AutomationSheetShell } from "./AutomationSheetShell";
import { ConditionsBuilder } from "./ConditionsBuilder";
import { TriggerSection } from "./TriggerSection";

const DEFAULT_VALUES: AutomationFormInput = {
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

export const CreateAutomationSheet: React.FC = () => {
	const { t } = useTranslation(["automations", "common"]);
	const { isCreateSheetOpen, closeCreateSheet } = useAutomationsUIStore();
	const { mutate: createAutomation, isPending } = useCreateAutomation();

	const form = useForm<AutomationFormInput, undefined, AutomationFormOutput>({
		resolver: zodResolver(createAutomationSchema),
		mode: "onSubmit",
		reValidateMode: "onChange",
		defaultValues: DEFAULT_VALUES,
	});

	const {
		register,
		handleSubmit,
		reset,
		setFocus,
		formState: { errors },
	} = form;

	useEffect(() => {
		if (isCreateSheetOpen) {
			setFocus("name");
		} else {
			reset(DEFAULT_VALUES);
		}
	}, [isCreateSheetOpen, reset, setFocus]);

	const onSubmit = (data: AutomationFormOutput) => {
		createAutomation(
			{
				name: data.name,
				isActive: data.isActive,
				rulePayload: JSON.stringify(mapFormToRulePayload(data)),
			},
			{
				onSuccess: () => {
					reset(DEFAULT_VALUES);
					closeCreateSheet();
				},
			},
		);
	};

	return (
		<FormProvider {...form}>
			<AutomationSheetShell
				isOpen={isCreateSheetOpen}
				onClose={closeCreateSheet}
				onSubmit={handleSubmit(onSubmit)}
				title={t("form.create.title")}
				description={t("form.create.description")}
				footer={
					<>
						<button
							type="button"
							onClick={closeCreateSheet}
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
							{t("form.create.submitButton")}
						</button>
					</>
				}
			>
				<div className="space-y-6">
					<AutomationField
						id="name"
						label={t("form.fields.name.label")}
						error={errors.name?.message}
					>
						<input
							id="name"
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
