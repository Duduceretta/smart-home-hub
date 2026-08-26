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

export function ActionsBuilder() {
	const { t } = useTranslation("automations");
	const {
		control,
		formState: { errors },
	} = useFormContext<AutomationFormInput>();
	const { fields, append, remove } = useFieldArray({
		control,
		name: "actions",
	});
	const { data: devices = [] } = usePickerDevices();

	const addAction = () => {
		append({ deviceId: devices[0]?.id ?? "", desiredState: "true" });
	};

	return (
		<div className="space-y-4 rounded-xl border border-border-subtle/20 bg-surface-low p-4">
			<h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
				{t("actions.title")}
			</h3>

			{(errors.actions?.root?.message ?? errors.actions?.message) && (
				<p className="text-[11px] font-medium text-alert-foreground">
					{errors.actions?.root?.message ?? errors.actions?.message}
				</p>
			)}

			<div className="space-y-3">
				{fields.map((field, index) => (
					<div
						key={field.id}
						className="grid grid-cols-1 gap-2 rounded-lg border border-border-subtle/20 bg-surface-container p-3 sm:grid-cols-[1fr_1fr_auto]"
					>
						<Controller
							control={control}
							name={`actions.${index}.deviceId`}
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
							name={`actions.${index}.desiredState`}
							render={({ field: stateField }) => (
								<Select
									value={stateField.value}
									onValueChange={stateField.onChange}
								>
									<SelectTrigger className="w-full">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="true">{t("actions.turnOn")}</SelectItem>
										<SelectItem value="false">
											{t("actions.turnOff")}
										</SelectItem>
									</SelectContent>
								</Select>
							)}
						/>

						<button
							type="button"
							onClick={() => remove(index)}
							aria-label={t("conditions.removeRow")}
							className="flex items-center justify-center rounded-lg border border-border-subtle/20 p-2 text-muted-foreground transition-colors hover:border-alert/50 hover:text-alert-foreground cursor-pointer"
						>
							<Trash2 className="h-3.5 w-3.5" />
						</button>

						{errors.actions?.[index]?.deviceId?.message && (
							<p className="col-span-full pl-1 text-[11px] font-medium text-alert-foreground">
								{errors.actions[index]?.deviceId?.message}
							</p>
						)}
					</div>
				))}
			</div>

			<button
				type="button"
				onClick={addAction}
				className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 cursor-pointer"
			>
				<Plus className="h-3.5 w-3.5" />
				{t("actions.addRow")}
			</button>
		</div>
	);
}
