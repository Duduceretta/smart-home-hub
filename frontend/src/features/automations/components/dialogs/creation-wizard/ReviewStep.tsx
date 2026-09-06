import type { TFunction } from "i18next";
import { Loader2, Pencil, Zap } from "lucide-react";
import { useTranslation } from "react-i18next";
import { FormGlobalError } from "@/core/components/forms/FormGlobalError";
import { Button } from "@/core/components/ui/button";
import { Input } from "@/core/components/ui/input";
import { Label } from "@/core/components/ui/label";
import { Switch } from "@/core/components/ui/switch";
import {
	SENSOR_METRIC_LABELS,
	WEEKDAY_OPTIONS,
} from "../../../constants/automations.constants";
import type { UseAutomationWizardReturn } from "../../../hooks/useAutomationWizard";
import { isNameValid } from "../../../lib/automation-form-reducer";
import type { AutomationWizardState } from "../../../types/automation-wizard.types";
import type { PickerDevice } from "../../../types/automations.types";

function findDeviceName(
	id: string,
	devices: PickerDevice[],
	t: TFunction<"automations">,
): string {
	return (
		devices.find((d) => d.id === id)?.name ??
		t("wizard.reviewStep.deviceRemoved")
	);
}

function describeTrigger(
	state: AutomationWizardState,
	devices: PickerDevice[],
	t: TFunction<"automations">,
): string {
	const deviceName = (id: string) => findDeviceName(id, devices, t);

	if (state.triggerSource === "sensor") {
		const { deviceId, metric, comparison, value } = state.sensorConfig;
		return t("wizard.triggerConfig.sensor.preview", {
			device: deviceName(deviceId),
			metric: t(
				`wizard.triggerConfig.metricsPreview.${metric}`,
				SENSOR_METRIC_LABELS[metric].toLowerCase(),
			),
			comparison: t(`comparisons.${comparison}`),
			value,
		});
	}

	if (state.triggerSource === "device") {
		const { deviceId, desiredIsOn } = state.deviceConfig;
		return t("wizard.triggerConfig.device.preview", {
			device: deviceName(deviceId),
			state: desiredIsOn
				? t("wizard.triggerConfig.device.on")
				: t("wizard.triggerConfig.device.off"),
		});
	}

	if (state.triggerSource === "schedule") {
		const { time, weekdays } = state.scheduleConfig;
		const daysLabel =
			weekdays.length === 7
				? t("wizard.triggerConfig.schedule.everyDay")
				: weekdays
						.map((d) =>
							t(
								`wizard.triggerConfig.weekdays.${d}.label`,
								WEEKDAY_OPTIONS[d].label,
							),
						)
						.join(", ");
		return t("wizard.triggerConfig.schedule.preview", {
			days: daysLabel,
			time,
		});
	}

	return t("wizard.reviewStep.triggerNotConfigured");
}

interface ReviewStepProps {
	wizard: UseAutomationWizardReturn;
	devices: PickerDevice[];
	onSubmit: () => void;
	isSubmitting: boolean;
	submitError?: string;
}

/**
 * Passo 4 — nome, recapitulação do gatilho/ações (com "Editar" voltando
 * pro passo correspondente sem limpar nada, já que tudo mora no reducer
 * do wizard) e o toggle final antes de salvar.
 */
export function ReviewStep({
	wizard,
	devices,
	onSubmit,
	isSubmitting,
	submitError,
}: ReviewStepProps) {
	const { t } = useTranslation("automations");
	const { state, setName, setActivateImmediately, goToStep } = wizard;

	const deviceName = (id: string) => findDeviceName(id, devices, t);

	return (
		<div className="flex flex-1 flex-col gap-4">
			<div>
				<h2 className="text-lg font-medium text-foreground">
					{t("wizard.reviewStep.title")}
				</h2>
				<p className="mt-0.5 text-sm text-muted-foreground">
					{t("wizard.reviewStep.subtitle")}
				</p>
			</div>

			<FormGlobalError error={submitError} />

			<div className="flex flex-col gap-1.5">
				<Label htmlFor="automation-name">
					{t("wizard.reviewStep.nameLabel")}
				</Label>
				<Input
					id="automation-name"
					autoFocus
					value={state.name}
					onChange={(event) => setName(event.target.value)}
					placeholder={t("wizard.reviewStep.namePlaceholder")}
					maxLength={150}
					className="h-11 sm:h-9"
				/>
			</div>

			<div className="rounded-lg border border-border-subtle/10 bg-surface-high p-4">
				<div className="mb-2 flex items-center justify-between">
					<span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
						{t("wizard.reviewStep.triggerSection")}
					</span>
					<button
						type="button"
						onClick={() => goToStep(2)}
						className="inline-flex h-11 sm:h-auto items-center gap-1 text-sm text-primary hover:underline cursor-pointer"
					>
						<Pencil className="h-3 w-3" />
						{t("wizard.reviewStep.edit")}
					</button>
				</div>
				<p className="text-sm text-foreground">
					{describeTrigger(state, devices, t)}
				</p>
			</div>

			<div className="rounded-lg border border-border-subtle/10 bg-surface-high p-4">
				<div className="mb-2 flex items-center justify-between">
					<span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
						{t("wizard.reviewStep.actionsSection")}
					</span>
					<button
						type="button"
						onClick={() => goToStep(3)}
						className="inline-flex h-11 sm:h-auto items-center gap-1 text-sm text-primary hover:underline cursor-pointer"
					>
						<Pencil className="h-3 w-3" />
						{t("wizard.reviewStep.edit")}
					</button>
				</div>
				<ul className="space-y-1">
					{state.actions.map((action) => (
						<li
							key={action.id}
							className="flex items-center gap-1 text-sm text-foreground"
						>
							<Zap className="h-3 w-3 shrink-0 text-muted-foreground" />
							{action.desiredState
								? t("wizard.reviewStep.actionOn")
								: t("wizard.reviewStep.actionOff")}{" "}
							{deviceName(action.deviceId)}
						</li>
					))}
				</ul>
			</div>

			<div className="flex items-center justify-between rounded-lg border border-border-subtle/10 bg-surface-high p-4">
				<div>
					<p className="text-sm font-medium text-foreground">
						{t("wizard.reviewStep.activateTitle")}
					</p>
					<p className="text-sm text-muted-foreground">
						{t("wizard.reviewStep.activateDescription")}
					</p>
				</div>
				<div className="flex h-11 items-center shrink-0">
					<Switch
						checked={state.activateImmediately}
						onCheckedChange={setActivateImmediately}
						aria-label={t("wizard.reviewStep.activateAria")}
					/>
				</div>
			</div>

			<div className="mt-auto flex items-center justify-between gap-3 border-t border-border-subtle/10 pt-4">
				<Button
					type="button"
					variant="outline"
					className="h-11 sm:h-9"
					onClick={() => goToStep(3)}
					disabled={isSubmitting}
				>
					{t("wizard.reviewStep.back")}
				</Button>
				<Button
					type="button"
					className="h-11 sm:h-9"
					onClick={onSubmit}
					disabled={isSubmitting || !isNameValid(state)}
				>
					{isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
					{t("wizard.reviewStep.submit")}
				</Button>
			</div>
		</div>
	);
}
