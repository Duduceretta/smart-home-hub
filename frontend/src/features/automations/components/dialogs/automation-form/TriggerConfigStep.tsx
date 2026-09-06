import { useTranslation } from "react-i18next";
import { Label } from "@/core/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/core/components/ui/select";
import { cn } from "@/core/utils";
import {
	SENSOR_METRIC_LABELS,
	WEEKDAY_OPTIONS,
} from "../../../constants/automations.constants";
import type { AutomationFormController } from "../../../types/automation-wizard.types";
import type { PickerDevice } from "../../../types/automations.types";

export const COMPARISON_OPERATORS = [">", ">=", "<", "<=", "==", "!="] as const;

interface TriggerConfigStepProps {
	form: AutomationFormController;
	devices: PickerDevice[];
	isLoadingDevices: boolean;
}

function DeviceSelect({
	devices,
	isLoading,
	value,
	onChange,
	placeholder,
	loadingText,
}: {
	devices: PickerDevice[];
	isLoading: boolean;
	value: string;
	onChange: (deviceId: string) => void;
	placeholder: string;
	loadingText: string;
}) {
	return (
		<Select value={value || undefined} onValueChange={onChange}>
			<SelectTrigger className="h-11 sm:h-9 w-full" disabled={isLoading}>
				<SelectValue placeholder={isLoading ? loadingText : placeholder} />
			</SelectTrigger>
			<SelectContent>
				{devices.map((device) => (
					<SelectItem key={device.id} value={device.id}>
						{device.name}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}

/**
 * Formulário condicional pelo `triggerSource` já escolhido — usado tanto
 * como Passo 2 do wizard de criação quanto inline na seção "Gatilho" do
 * formulário de edição. "Sensor" e "Dispositivo" produzem o mesmo tipo de
 * trigger no backend (device_state + uma condição), só mudam quais campos
 * aparecem pro usuário (métrica numérica vs. estado ligado/desligado) —
 * ver automation-wizard-payload.mapper.ts pra como isso vira o RulePayload.
 */
export function TriggerConfigStep({
	form,
	devices,
	isLoadingDevices,
}: TriggerConfigStepProps) {
	const { t } = useTranslation("automations");
	const {
		state,
		updateSensorConfig,
		updateDeviceConfig,
		updateScheduleConfig,
		toggleWeekday,
	} = form;

	const comparisonOptions = COMPARISON_OPERATORS.map((value) => ({
		value,
		label: t(`comparisons.${value}`),
	}));

	if (state.triggerSource === "sensor") {
		const { sensorConfig } = state;
		return (
			<div className="flex flex-1 flex-col gap-4">
				<SectionHeader
					title={t("wizard.triggerConfig.sensor.title")}
					subtitle={t("wizard.triggerConfig.sensor.subtitle")}
				/>

				<div className="flex flex-col gap-1.5">
					<Label>{t("wizard.triggerConfig.sensor.deviceLabel")}</Label>
					<DeviceSelect
						devices={devices}
						isLoading={isLoadingDevices}
						value={sensorConfig.deviceId}
						onChange={(deviceId) => updateSensorConfig({ deviceId })}
						placeholder={t("wizard.triggerConfig.selectDevicePlaceholder")}
						loadingText={t("wizard.triggerConfig.loading")}
					/>
				</div>

				<div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
					<div className="flex flex-col gap-1.5">
						<Label>{t("wizard.triggerConfig.sensor.metricLabel")}</Label>
						<Select
							value={sensorConfig.metric}
							onValueChange={(value) =>
								updateSensorConfig({
									metric: value as typeof sensorConfig.metric,
								})
							}
						>
							<SelectTrigger className="h-11 sm:h-9 w-full">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{(
									Object.keys(
										SENSOR_METRIC_LABELS,
									) as (keyof typeof SENSOR_METRIC_LABELS)[]
								).map((metric) => (
									<SelectItem key={metric} value={metric}>
										{t(
											`wizard.triggerConfig.metrics.${metric}`,
											SENSOR_METRIC_LABELS[metric],
										)}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="flex flex-col gap-1.5">
						<Label>{t("wizard.triggerConfig.sensor.conditionLabel")}</Label>
						<Select
							value={sensorConfig.comparison}
							onValueChange={(value) =>
								updateSensorConfig({
									comparison: value as typeof sensorConfig.comparison,
								})
							}
						>
							<SelectTrigger className="h-11 sm:h-9 w-full">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{comparisonOptions.map((option) => (
									<SelectItem key={option.value} value={option.value}>
										{option.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="flex flex-col gap-1.5">
						<Label htmlFor="sensor-value">
							{t("wizard.triggerConfig.sensor.valueLabel")}
						</Label>
						<input
							id="sensor-value"
							type="number"
							value={sensorConfig.value}
							onChange={(event) =>
								updateSensorConfig({ value: event.target.value })
							}
							placeholder={t("wizard.triggerConfig.sensor.valuePlaceholder")}
							className="h-11 sm:h-9 w-full rounded-lg border border-border-subtle bg-surface-high px-3 text-sm text-foreground outline-none transition-colors focus:border-primary/50 focus:ring-1 focus:ring-primary/50"
						/>
					</div>
				</div>

				{sensorConfig.deviceId && sensorConfig.value && (
					<ConfigPreview>
						{t("wizard.triggerConfig.sensor.preview", {
							device:
								devices.find((d) => d.id === sensorConfig.deviceId)?.name ?? "",
							metric: t(
								`wizard.triggerConfig.metricsPreview.${sensorConfig.metric}`,
								SENSOR_METRIC_LABELS[sensorConfig.metric].toLowerCase(),
							),
							comparison: t(`comparisons.${sensorConfig.comparison}`),
							value: sensorConfig.value,
						})}
					</ConfigPreview>
				)}
			</div>
		);
	}

	if (state.triggerSource === "device") {
		const { deviceConfig } = state;
		return (
			<div className="flex flex-1 flex-col gap-4">
				<SectionHeader
					title={t("wizard.triggerConfig.device.title")}
					subtitle={t("wizard.triggerConfig.device.subtitle")}
				/>

				<div className="flex flex-col gap-1.5">
					<Label>{t("wizard.triggerConfig.device.deviceLabel")}</Label>
					<DeviceSelect
						devices={devices}
						isLoading={isLoadingDevices}
						value={deviceConfig.deviceId}
						onChange={(deviceId) => updateDeviceConfig({ deviceId })}
						placeholder={t("wizard.triggerConfig.selectDevicePlaceholder")}
						loadingText={t("wizard.triggerConfig.loading")}
					/>
				</div>

				<div className="flex flex-col gap-1.5">
					<Label>{t("wizard.triggerConfig.device.statusLabel")}</Label>
					<div className="grid grid-cols-2 gap-2">
						<button
							type="button"
							aria-pressed={deviceConfig.desiredIsOn}
							onClick={() => updateDeviceConfig({ desiredIsOn: true })}
							className={cn(
								"h-11 sm:h-8.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors cursor-pointer",
								deviceConfig.desiredIsOn
									? "border-primary/40 bg-primary/10 text-primary"
									: "border-border-subtle bg-surface-high text-muted-foreground hover:text-foreground",
							)}
						>
							{t("wizard.triggerConfig.device.on")}
						</button>
						<button
							type="button"
							aria-pressed={!deviceConfig.desiredIsOn}
							onClick={() => updateDeviceConfig({ desiredIsOn: false })}
							className={cn(
								"h-11 sm:h-8.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors cursor-pointer",
								!deviceConfig.desiredIsOn
									? "border-primary/40 bg-primary/10 text-primary"
									: "border-border-subtle bg-surface-high text-muted-foreground hover:text-foreground",
							)}
						>
							{t("wizard.triggerConfig.device.off")}
						</button>
					</div>
				</div>

				{deviceConfig.deviceId && (
					<ConfigPreview>
						{t("wizard.triggerConfig.device.preview", {
							device:
								devices.find((d) => d.id === deviceConfig.deviceId)?.name ?? "",
							state: deviceConfig.desiredIsOn
								? t("wizard.triggerConfig.device.on")
								: t("wizard.triggerConfig.device.off"),
						})}
					</ConfigPreview>
				)}
			</div>
		);
	}

	// schedule
	const { scheduleConfig } = state;
	return (
		<div className="flex flex-1 flex-col gap-4">
			<SectionHeader
				title={t("wizard.triggerConfig.schedule.title")}
				subtitle={t("wizard.triggerConfig.schedule.subtitle")}
			/>

			<div className="flex flex-col gap-1.5">
				<Label htmlFor="schedule-time">
					{t("wizard.triggerConfig.schedule.timeLabel")}
				</Label>
				<input
					id="schedule-time"
					type="time"
					value={scheduleConfig.time}
					onChange={(event) =>
						updateScheduleConfig({ time: event.target.value })
					}
					className="h-11 sm:h-9 w-full sm:w-40 rounded-lg border border-border-subtle bg-surface-high px-3 text-sm text-foreground outline-none transition-colors focus:border-primary/50 focus:ring-1 focus:ring-primary/50"
				/>
			</div>

			<div className="flex flex-col gap-1.5">
				<Label>{t("wizard.triggerConfig.schedule.weekdaysLabel")}</Label>
				<div className="flex flex-wrap gap-2">
					{WEEKDAY_OPTIONS.map((day) => {
						const isSelected = scheduleConfig.weekdays.includes(day.value);
						return (
							<button
								key={day.value}
								type="button"
								aria-pressed={isSelected}
								title={t(
									`wizard.triggerConfig.weekdays.${day.value}.label`,
									day.label,
								)}
								onClick={() => toggleWeekday(day.value)}
								className={cn(
									"flex h-11 w-11 sm:h-8 sm:w-8 items-center justify-center rounded-full text-xs font-medium transition-colors cursor-pointer",
									isSelected
										? "bg-primary/15 text-primary ring-1 ring-primary/40"
										: "bg-surface-high text-muted-foreground hover:text-foreground",
								)}
							>
								{t(
									`wizard.triggerConfig.weekdays.${day.value}.short`,
									day.short,
								)}
							</button>
						);
					})}
				</div>
			</div>

			{scheduleConfig.time && scheduleConfig.weekdays.length > 0 && (
				<ConfigPreview>
					{t("wizard.triggerConfig.schedule.preview", {
						days:
							scheduleConfig.weekdays.length === 7
								? t("wizard.triggerConfig.schedule.everyDay")
								: scheduleConfig.weekdays
										.map((d) =>
											t(
												`wizard.triggerConfig.weekdays.${d}.label`,
												WEEKDAY_OPTIONS[d].label,
											),
										)
										.join(", "),
						time: scheduleConfig.time,
					})}
				</ConfigPreview>
			)}
		</div>
	);
}

function SectionHeader({
	title,
	subtitle,
}: {
	title: string;
	subtitle: string;
}) {
	return (
		<div>
			<h2 className="text-lg font-medium text-foreground">{title}</h2>
			<p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>
		</div>
	);
}

function ConfigPreview({ children }: { children: React.ReactNode }) {
	return (
		<div className="rounded-lg border border-border-subtle/10 bg-surface-high p-4 text-sm text-foreground">
			{children}
		</div>
	);
}
