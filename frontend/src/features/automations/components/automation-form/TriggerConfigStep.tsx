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
} from "../../constants/automations.constants";
import type { AutomationFormController } from "../../types/automation-wizard.types";
import type { PickerDevice } from "../../types/automations.types";

const COMPARISON_OPTIONS: { value: string; label: string }[] = [
	{ value: ">", label: "maior que" },
	{ value: ">=", label: "maior ou igual a" },
	{ value: "<", label: "menor que" },
	{ value: "<=", label: "menor ou igual a" },
	{ value: "==", label: "igual a" },
	{ value: "!=", label: "diferente de" },
];

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
}: {
	devices: PickerDevice[];
	isLoading: boolean;
	value: string;
	onChange: (deviceId: string) => void;
	placeholder: string;
}) {
	return (
		<Select value={value || undefined} onValueChange={onChange}>
			<SelectTrigger className="w-full" disabled={isLoading}>
				<SelectValue placeholder={isLoading ? "Carregando..." : placeholder} />
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
	const {
		state,
		updateSensorConfig,
		updateDeviceConfig,
		updateScheduleConfig,
		toggleWeekday,
	} = form;

	if (state.triggerSource === "sensor") {
		const { sensorConfig } = state;
		return (
			<div className="flex flex-1 flex-col gap-4">
				<SectionHeader
					title="Configure o sensor"
					subtitle="Escolha o dispositivo e a condição que dispara a automação."
				/>

				<div className="flex flex-col gap-1.5">
					<Label>Dispositivo</Label>
					<DeviceSelect
						devices={devices}
						isLoading={isLoadingDevices}
						value={sensorConfig.deviceId}
						onChange={(deviceId) => updateSensorConfig({ deviceId })}
						placeholder="Selecione um dispositivo"
					/>
				</div>

				<div className="grid grid-cols-3 gap-3">
					<div className="flex flex-col gap-1.5">
						<Label>Métrica</Label>
						<Select
							value={sensorConfig.metric}
							onValueChange={(value) =>
								updateSensorConfig({
									metric: value as typeof sensorConfig.metric,
								})
							}
						>
							<SelectTrigger className="w-full">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{Object.entries(SENSOR_METRIC_LABELS).map(([value, label]) => (
									<SelectItem key={value} value={value}>
										{label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="flex flex-col gap-1.5">
						<Label>Condição</Label>
						<Select
							value={sensorConfig.comparison}
							onValueChange={(value) =>
								updateSensorConfig({
									comparison: value as typeof sensorConfig.comparison,
								})
							}
						>
							<SelectTrigger className="w-full">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{COMPARISON_OPTIONS.map((option) => (
									<SelectItem key={option.value} value={option.value}>
										{option.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="flex flex-col gap-1.5">
						<Label htmlFor="sensor-value">Valor</Label>
						<input
							id="sensor-value"
							type="number"
							value={sensorConfig.value}
							onChange={(event) =>
								updateSensorConfig({ value: event.target.value })
							}
							placeholder="Ex: 28"
							className="h-8 w-full rounded-lg border border-border-subtle/20 bg-surface-container px-2.5 text-sm text-foreground outline-none transition-colors focus:border-primary/50 focus:ring-1 focus:ring-primary/50"
						/>
					</div>
				</div>

				{sensorConfig.deviceId && sensorConfig.value && (
					<ConfigPreview>
						Quando {devices.find((d) => d.id === sensorConfig.deviceId)?.name}{" "}
						tiver {SENSOR_METRIC_LABELS[sensorConfig.metric].toLowerCase()}{" "}
						{
							COMPARISON_OPTIONS.find(
								(c) => c.value === sensorConfig.comparison,
							)?.label
						}{" "}
						{sensorConfig.value}
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
					title="Configure o dispositivo"
					subtitle="Escolha o dispositivo e qual mudança de estado dispara a automação."
				/>

				<div className="flex flex-col gap-1.5">
					<Label>Dispositivo</Label>
					<DeviceSelect
						devices={devices}
						isLoading={isLoadingDevices}
						value={deviceConfig.deviceId}
						onChange={(deviceId) => updateDeviceConfig({ deviceId })}
						placeholder="Selecione um dispositivo"
					/>
				</div>

				<div className="flex flex-col gap-1.5">
					<Label>Status muda para</Label>
					<div className="grid grid-cols-2 gap-2">
						<button
							type="button"
							aria-pressed={deviceConfig.desiredIsOn}
							onClick={() => updateDeviceConfig({ desiredIsOn: true })}
							className={cn(
								"rounded-lg border px-3 py-2 text-xs font-medium transition-colors cursor-pointer",
								deviceConfig.desiredIsOn
									? "border-primary/40 bg-primary/10 text-primary"
									: "border-border-subtle/20 bg-surface-container text-muted-foreground hover:text-foreground",
							)}
						>
							Ligado
						</button>
						<button
							type="button"
							aria-pressed={!deviceConfig.desiredIsOn}
							onClick={() => updateDeviceConfig({ desiredIsOn: false })}
							className={cn(
								"rounded-lg border px-3 py-2 text-xs font-medium transition-colors cursor-pointer",
								!deviceConfig.desiredIsOn
									? "border-primary/40 bg-primary/10 text-primary"
									: "border-border-subtle/20 bg-surface-container text-muted-foreground hover:text-foreground",
							)}
						>
							Desligado
						</button>
					</div>
				</div>

				{deviceConfig.deviceId && (
					<ConfigPreview>
						Quando {devices.find((d) => d.id === deviceConfig.deviceId)?.name}{" "}
						mudar para {deviceConfig.desiredIsOn ? "Ligado" : "Desligado"}
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
				title="Configure o horário"
				subtitle="Escolha o horário e os dias da semana em que a automação deve rodar."
			/>

			<div className="flex flex-col gap-1.5">
				<Label htmlFor="schedule-time">Horário</Label>
				<input
					id="schedule-time"
					type="time"
					value={scheduleConfig.time}
					onChange={(event) =>
						updateScheduleConfig({ time: event.target.value })
					}
					className="h-8 w-40 rounded-lg border border-border-subtle/20 bg-surface-container px-2.5 text-sm text-foreground outline-none transition-colors focus:border-primary/50 focus:ring-1 focus:ring-primary/50"
				/>
			</div>

			<div className="flex flex-col gap-1.5">
				<Label>Dias da semana</Label>
				<div className="flex flex-wrap gap-1.5">
					{WEEKDAY_OPTIONS.map((day) => {
						const isSelected = scheduleConfig.weekdays.includes(day.value);
						return (
							<button
								key={day.value}
								type="button"
								aria-pressed={isSelected}
								title={day.label}
								onClick={() => toggleWeekday(day.value)}
								className={cn(
									"flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium transition-colors cursor-pointer",
									isSelected
										? "bg-primary/15 text-primary ring-1 ring-primary/40"
										: "bg-surface-container text-muted-foreground hover:text-foreground",
								)}
							>
								{day.short}
							</button>
						);
					})}
				</div>
			</div>

			{scheduleConfig.time && scheduleConfig.weekdays.length > 0 && (
				<ConfigPreview>
					{scheduleConfig.weekdays.length === 7
						? "Todos os dias"
						: scheduleConfig.weekdays
								.map((d) => WEEKDAY_OPTIONS[d].label)
								.join(", ")}{" "}
					às {scheduleConfig.time}
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
			<h2 className="text-sm font-semibold text-foreground">{title}</h2>
			<p className="mt-0.5 text-[11px] text-muted-foreground">{subtitle}</p>
		</div>
	);
}

function ConfigPreview({ children }: { children: React.ReactNode }) {
	return (
		<div className="rounded-lg border border-border-subtle/20 bg-surface-container p-3 text-sm text-foreground">
			{children}
		</div>
	);
}
