import type {
	AutomationFormState,
	SensorMetric,
	TriggerSource,
} from "../types/automation-wizard.types";
import type {
	Automation,
	AutomationConditionNode,
	AutomationPayload,
	AutomationRule,
} from "../types/automations.types";
import {
	DEFAULT_DEVICE_CONFIG,
	DEFAULT_SCHEDULE_CONFIG,
	DEFAULT_SENSOR_CONFIG,
} from "./automation-form-reducer";

const SENSOR_METRICS: readonly SensorMetric[] = [
	"temperature",
	"powerUsageWatts",
];

/**
 * Inverso de `buildCronExpression` — só reconhece os padrões que o próprio
 * wizard produz (5 campos, dia/mês fixos em `*`, hora/minuto numéricos).
 * Um cron editado manualmente fora desse formato (ex: direto no banco) cai
 * no fallback abaixo em vez de quebrar a tela.
 */
function parseCronExpression(
	cron: string,
): AutomationFormState["scheduleConfig"] | null {
	const parts = cron.trim().split(/\s+/);
	if (parts.length !== 5) return null;

	const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
	if (dayOfMonth !== "*" || month !== "*") return null;
	if (!/^\d{1,2}$/.test(minute) || !/^\d{1,2}$/.test(hour)) return null;

	const time = `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`;
	const weekdays =
		dayOfWeek === "*"
			? [0, 1, 2, 3, 4, 5, 6]
			: dayOfWeek
					.split(",")
					.map(Number)
					.filter((day) => !Number.isNaN(day) && day >= 0 && day <= 6);

	return { time, weekdays: weekdays.length > 0 ? weekdays : [0] };
}

/** A regra que de fato compara uma propriedade — ignora a de `property: "deviceId"` usada só pra escopo (ver automation-wizard-payload.mapper.ts). */
function findPropertyRule(
	conditions: AutomationConditionNode | null,
): AutomationRule | null {
	return conditions?.rules.find((rule) => rule.property !== "deviceId") ?? null;
}

/**
 * Mesma heurística usada na criação: `device_state` com `stateType: "isOn"`
 * é o que o wizard gera pra origem "Dispositivo"; qualquer outra métrica
 * numérica é "Sensor". `time` é sempre "Sequência" (horário).
 */
function determineTriggerSource(
	payload: AutomationPayload | null,
): TriggerSource | null {
	const trigger = payload?.triggers?.[0];
	if (!trigger) return null;
	if (trigger.type === "time") return "schedule";
	return trigger.stateType === "isOn" ? "device" : "sensor";
}

/**
 * Reconstrói o `AutomationFormState` a partir de uma `Automation` real
 * (rulePayload em JSON) — o inverso de `mapFormStateToUpdatePayload`. Usado
 * só pra inicializar o formulário de edição (o tipo de gatilho, uma vez
 * carregado, fica fixo — não navega de volta por aqui).
 */
export function mapAutomationToFormState(
	automation: Automation,
): AutomationFormState {
	let payload: AutomationPayload | null = null;
	try {
		payload = JSON.parse(automation.rulePayload) as AutomationPayload;
	} catch {
		payload = null;
	}

	const triggerSource = determineTriggerSource(payload);
	const trigger = payload?.triggers?.[0];
	const propertyRule = findPropertyRule(payload?.conditions ?? null);

	const sensorConfig: AutomationFormState["sensorConfig"] =
		triggerSource === "sensor" && propertyRule
			? {
					deviceId: propertyRule.deviceId,
					metric: SENSOR_METRICS.includes(propertyRule.property as SensorMetric)
						? (propertyRule.property as SensorMetric)
						: "temperature",
					comparison: propertyRule.comparison,
					value: String(propertyRule.value),
				}
			: DEFAULT_SENSOR_CONFIG;

	const deviceConfig: AutomationFormState["deviceConfig"] =
		triggerSource === "device" && propertyRule
			? {
					deviceId: propertyRule.deviceId,
					desiredIsOn: propertyRule.value === true,
				}
			: DEFAULT_DEVICE_CONFIG;

	const scheduleConfig: AutomationFormState["scheduleConfig"] =
		(triggerSource === "schedule" &&
			trigger?.type === "time" &&
			parseCronExpression(trigger.cronExpression)) ||
		DEFAULT_SCHEDULE_CONFIG;

	return {
		triggerSource,
		sensorConfig,
		deviceConfig,
		scheduleConfig,
		actions: (payload?.actions ?? []).map((action) => ({
			id: crypto.randomUUID(),
			deviceId: action.deviceId,
			desiredState: action.desiredState,
		})),
		editingActionId: null,
		name: automation.name,
		activateImmediately: automation.isActive,
	};
}
