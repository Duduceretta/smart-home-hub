import { Calendar, Clock, MapPin, Radio, ToggleLeft } from "lucide-react";
import type { ComponentType } from "react";
import type {
	SensorMetric,
	TriggerSource,
} from "../types/automation-wizard.types";

/**
 * Ícone por tipo de gatilho — usado em AutomationCard, AutomationRow e
 * AutomationDetailPanel. Centralizado aqui (em vez de repetido em cada
 * componente) igual ao ROOM_ICON_MAP em rooms/constants.
 */
export const AUTOMATION_TRIGGER_ICON: Record<
	"schedule" | "sensor",
	ComponentType<{ className?: string }>
> = {
	schedule: Clock,
	sensor: Radio,
};

/**
 * As 4 origens de gatilho do Passo 1 do wizard de criação. `location` fica
 * marcada como `comingSoon` — o backend não tem nenhum conceito de
 * geofencing hoje (sem lat/long no domínio, sem propriedade equivalente no
 * `AutomationEvaluationContext`), então o card aparece pra completar a
 * grade de 4 opções mas não é selecionável.
 */
export const TRIGGER_SOURCE_OPTIONS: {
	value: TriggerSource;
	label: string;
	description: string;
	icon: ComponentType<{ className?: string }>;
	comingSoon?: boolean;
}[] = [
	{
		value: "sensor",
		label: "Sensor",
		description:
			"Reage a uma leitura de sensor, como temperatura ou consumo de energia.",
		icon: Radio,
	},
	{
		value: "device",
		label: "Dispositivo",
		description:
			"Dispara quando um dispositivo muda de estado — liga, desliga ou abre.",
		icon: ToggleLeft,
	},
	{
		value: "location",
		label: "Localização",
		description: "Entrada ou saída de uma área (geofencing).",
		icon: MapPin,
		comingSoon: true,
	},
	{
		value: "schedule",
		label: "Horário",
		description: "Dispara num horário fixo, em dias específicos da semana.",
		icon: Calendar,
	},
];

export const SENSOR_METRIC_LABELS: Record<SensorMetric, string> = {
	temperature: "Temperatura (°C)",
	powerUsageWatts: "Consumo (W)",
};

/** Índice = valor usado no cron (0 = domingo ... 6 = sábado). */
export const WEEKDAY_OPTIONS = [
	{ value: 0, short: "D", label: "Domingo" },
	{ value: 1, short: "S", label: "Segunda" },
	{ value: 2, short: "T", label: "Terça" },
	{ value: 3, short: "Q", label: "Quarta" },
	{ value: 4, short: "Q", label: "Quinta" },
	{ value: 5, short: "S", label: "Sexta" },
	{ value: 6, short: "S", label: "Sábado" },
] as const;
