import { Controller, useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/core/components/ui/select";
import { usePickerDevices } from "../hooks/usePickerDevices";
import type { AutomationFormInput } from "../types/automation.schemas";
import { AutomationField } from "./AutomationField";

/**
 * Um único gatilho por automação: Horário (cron) OU Estado de Dispositivo.
 * O schema do backend aceita uma lista de triggers, mas a engine hoje só
 * realmente processa TimeTrigger (agenda no Hangfire); DeviceStateTrigger
 * sozinho é informativo — quem decide se a automação dispara é Conditions.
 */
export function TriggerSection() {
	const { t } = useTranslation("automations");
	const {
		register,
		control,
		watch,
		formState: { errors },
	} = useFormContext<AutomationFormInput>();
	const { data: devices = [], isLoading: isLoadingDevices } =
		usePickerDevices();

	const triggerType = watch("triggerType");

	return (
		<div className="space-y-4 rounded-xl border border-border-subtle/20 bg-surface-low p-4">
			<h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
				{t("trigger.title")}
			</h3>

			<Controller
				control={control}
				name="triggerType"
				render={({ field }) => (
					<div className="grid grid-cols-2 gap-2">
						<button
							type="button"
							onClick={() => field.onChange("time")}
							className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors cursor-pointer ${
								field.value === "time"
									? "border-primary/40 bg-primary/10 text-primary"
									: "border-border-subtle/20 bg-surface-container text-muted-foreground hover:text-foreground"
							}`}
						>
							{t("trigger.tabs.time")}
						</button>
						<button
							type="button"
							onClick={() => field.onChange("device_state")}
							className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors cursor-pointer ${
								field.value === "device_state"
									? "border-primary/40 bg-primary/10 text-primary"
									: "border-border-subtle/20 bg-surface-container text-muted-foreground hover:text-foreground"
							}`}
						>
							{t("trigger.tabs.deviceState")}
						</button>
					</div>
				)}
			/>

			{triggerType === "time" ? (
				<AutomationField
					id="cron"
					label={t("trigger.cron.label")}
					error={errors.cron?.message}
				>
					<input
						id="cron"
						type="text"
						placeholder={t("trigger.cron.placeholder")}
						className="w-full rounded-lg border border-border-subtle/20 bg-surface-container px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-primary/50 focus:ring-1 focus:ring-primary/50"
						{...register("cron")}
					/>
					<p className="pl-1 text-[11px] text-muted-foreground">
						{t("trigger.cron.help")}
					</p>
				</AutomationField>
			) : (
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<AutomationField
						id="triggerDeviceId"
						label={t("trigger.deviceState.deviceLabel")}
						error={errors.triggerDeviceId?.message}
					>
						<Controller
							control={control}
							name="triggerDeviceId"
							render={({ field }) => (
								<Select
									value={field.value}
									onValueChange={field.onChange}
									disabled={isLoadingDevices}
								>
									<SelectTrigger id="triggerDeviceId" className="w-full">
										<SelectValue
											placeholder={t("trigger.deviceState.devicePlaceholder")}
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
						/>
					</AutomationField>

					<AutomationField
						id="triggerStateType"
						label={t("trigger.deviceState.stateTypeLabel")}
						error={errors.triggerStateType?.message}
					>
						<input
							id="triggerStateType"
							type="text"
							placeholder={t("trigger.deviceState.stateTypePlaceholder")}
							className="w-full rounded-lg border border-border-subtle/20 bg-surface-container px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-primary/50 focus:ring-1 focus:ring-primary/50"
							{...register("triggerStateType")}
						/>
					</AutomationField>
				</div>
			)}
		</div>
	);
}
