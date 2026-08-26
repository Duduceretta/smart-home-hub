import { Plus, Trash2 } from "lucide-react";
import { Controller, useFieldArray, useFormContext } from "react-hook-form";
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
import {
	CONDITION_COMPARISONS,
	CONDITION_PROPERTIES,
} from "../types/automation.schemas";
import type { ConditionProperty } from "../types/automations.types";

/** Valor padrão sensato ao trocar de propriedade — evita sobrar um número
 * onde o backend espera booleano (ou vice-versa) no JSON serializado. */
function defaultValueFor(property: ConditionProperty): string {
	if (property === "isOn") return "true";
	if (property === "temperature" || property === "powerUsageWatts") return "0";
	return "";
}

export function ConditionsBuilder() {
	const { t } = useTranslation("automations");
	const {
		control,
		register,
		setValue,
		watch,
		formState: { errors },
	} = useFormContext<AutomationFormInput>();
	const { fields, append, remove } = useFieldArray({
		control,
		name: "rules",
	});
	const { data: devices = [] } = usePickerDevices();

	const addRule = () => {
		append({
			deviceId: devices[0]?.id ?? "",
			property: "isOn",
			comparison: "==",
			value: "true",
		});
	};

	return (
		<div className="space-y-4 rounded-xl border border-border-subtle/20 bg-surface-low p-4">
			<div className="flex items-center justify-between">
				<h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
					{t("conditions.title")}
				</h3>

				{fields.length > 1 && (
					<Controller
						control={control}
						name="conditionOperator"
						render={({ field }) => (
							<Select value={field.value} onValueChange={field.onChange}>
								<SelectTrigger className="h-7 text-xs">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="AND">
										{t("conditions.operator.and")}
									</SelectItem>
									<SelectItem value="OR">
										{t("conditions.operator.or")}
									</SelectItem>
								</SelectContent>
							</Select>
						)}
					/>
				)}
			</div>

			{fields.length === 0 && (
				<p className="text-xs text-muted-foreground">{t("conditions.empty")}</p>
			)}

			<div className="space-y-3">
				{fields.map((field, index) => {
					const property = watch(`rules.${index}.property`);
					const valueError = errors.rules?.[index]?.value?.message;

					return (
						<div
							key={field.id}
							className="grid grid-cols-1 gap-2 rounded-lg border border-border-subtle/20 bg-surface-container p-3 sm:grid-cols-[1fr_1fr_1fr_1fr_auto]"
						>
							<Controller
								control={control}
								name={`rules.${index}.deviceId`}
								render={({ field: deviceField }) => (
									<Select
										value={deviceField.value}
										onValueChange={deviceField.onChange}
									>
										<SelectTrigger className="w-full">
											<SelectValue
												placeholder={t("conditions.devicePlaceholder")}
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

							<Controller
								control={control}
								name={`rules.${index}.property`}
								render={({ field: propertyField }) => (
									<Select
										value={propertyField.value}
										onValueChange={(next) => {
											propertyField.onChange(next);
											setValue(
												`rules.${index}.value`,
												defaultValueFor(next as ConditionProperty),
											);
										}}
									>
										<SelectTrigger className="w-full">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{CONDITION_PROPERTIES.map((option) => (
												<SelectItem key={option} value={option}>
													{t(`property.options.${option}`)}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								)}
							/>

							<Controller
								control={control}
								name={`rules.${index}.comparison`}
								render={({ field: comparisonField }) => (
									<Select
										value={comparisonField.value}
										onValueChange={comparisonField.onChange}
									>
										<SelectTrigger className="w-full">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{CONDITION_COMPARISONS.map((option) => (
												<SelectItem key={option} value={option}>
													{option}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								)}
							/>

							{property === "isOn" ? (
								<Controller
									control={control}
									name={`rules.${index}.value`}
									render={({ field: valueField }) => (
										<Select
											value={valueField.value}
											onValueChange={valueField.onChange}
										>
											<SelectTrigger className="w-full">
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="true">
													{t("property.isOnValue.on")}
												</SelectItem>
												<SelectItem value="false">
													{t("property.isOnValue.off")}
												</SelectItem>
											</SelectContent>
										</Select>
									)}
								/>
							) : property === "deviceId" ? (
								<Controller
									control={control}
									name={`rules.${index}.value`}
									render={({ field: valueField }) => (
										<Select
											value={valueField.value}
											onValueChange={valueField.onChange}
										>
											<SelectTrigger className="w-full">
												<SelectValue
													placeholder={t("conditions.devicePlaceholder")}
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
							) : (
								<input
									type="number"
									step="any"
									className="w-full rounded-lg border border-border-subtle/20 bg-surface-low px-3 py-2 text-xs text-foreground outline-none transition-colors focus:border-primary/50 focus:ring-1 focus:ring-primary/50"
									{...register(`rules.${index}.value`)}
								/>
							)}

							<button
								type="button"
								onClick={() => remove(index)}
								aria-label={t("conditions.removeRow")}
								className="flex items-center justify-center rounded-lg border border-border-subtle/20 p-2 text-muted-foreground transition-colors hover:border-alert/50 hover:text-alert-foreground cursor-pointer"
							>
								<Trash2 className="h-3.5 w-3.5" />
							</button>

							{valueError && (
								<p className="col-span-full pl-1 text-[11px] font-medium text-alert-foreground">
									{valueError}
								</p>
							)}
						</div>
					);
				})}
			</div>

			<button
				type="button"
				onClick={addRule}
				className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 cursor-pointer"
			>
				<Plus className="h-3.5 w-3.5" />
				{t("conditions.addRow")}
			</button>
		</div>
	);
}
