import type {
	Automation,
	AutomationPayload,
	AutomationView,
	ConditionComparison,
	ConditionProperty,
	PickerDevice,
} from "../types/automations.types";

const WEEKDAY_PRESETS: Record<string, string> = {
	"1-5": "Segunda a sexta",
	"0,6": "Fins de semana",
	"6,0": "Fins de semana",
};

/**
 * Traduz um cron de 5 campos (minuto hora dia mês dia-da-semana) pros
 * padrões mais comuns de automação residencial ("Todos os dias às 22:00").
 * Expressões fora desses padrões caem no fallback cru — não é um parser de
 * cron completo, só cobre os casos que o formulário de gatilho realmente
 * produz hoje.
 */
function humanizeCron(expression: string): string {
	const parts = expression.trim().split(/\s+/);
	if (parts.length !== 5) return `Cron: ${expression}`;

	const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
	const isDaily = dayOfMonth === "*" && month === "*";
	const isFixedTime = /^\d{1,2}$/.test(minute) && /^\d{1,2}$/.test(hour);

	if (!isDaily || !isFixedTime) return `Cron: ${expression}`;

	const time = `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`;

	if (dayOfWeek === "*") return `Todos os dias às ${time}`;
	if (WEEKDAY_PRESETS[dayOfWeek])
		return `${WEEKDAY_PRESETS[dayOfWeek]} às ${time}`;

	return `Cron: ${expression}`;
}

const PROPERTY_LABELS: Record<ConditionProperty, string> = {
	isOn: "estado",
	temperature: "temperatura",
	powerUsageWatts: "consumo",
	deviceId: "dispositivo",
};

const COMPARISON_LABELS: Record<ConditionComparison, string> = {
	"==": "=",
	"!=": "≠",
	">": ">",
	">=": "≥",
	"<": "<",
	"<=": "≤",
};

function describeConditionValue(
	property: ConditionProperty,
	value: unknown,
	devicesById: Map<string, PickerDevice>,
): string {
	if (property === "isOn") return value === true ? "ligado" : "desligado";
	if (property === "temperature") return `${value}°C`;
	if (property === "powerUsageWatts") return `${value}W`;
	if (property === "deviceId") {
		const device = devicesById.get(String(value));
		return device?.name ?? String(value);
	}
	return String(value);
}

function describeDevice(
	deviceId: string,
	devicesById: Map<string, PickerDevice>,
): string {
	return devicesById.get(deviceId)?.name ?? "dispositivo removido";
}

/**
 * Desserializa `automation.rulePayload` e resume trigger/condições/ações em
 * texto legível, usando a lista de dispositivos pra trocar IDs por nomes.
 * Payload inválido ou vazio (JSON corrompido, sem triggers/ações) marca a
 * automação como incompleta em vez de quebrar a tela.
 */
export function mapAutomationToView(
	automation: Automation,
	devices: PickerDevice[],
): AutomationView {
	const devicesById = new Map(devices.map((device) => [device.id, device]));

	let payload: AutomationPayload | null = null;
	try {
		payload = JSON.parse(automation.rulePayload) as AutomationPayload;
	} catch {
		payload = null;
	}

	const trigger = payload?.triggers?.[0];
	const isTimeTrigger = trigger?.type === "time";

	const triggerSummary = !trigger
		? "Sem gatilho configurado"
		: isTimeTrigger
			? humanizeCron(trigger.cronExpression)
			: `Quando ${describeDevice(trigger.deviceId, devicesById)} mudar (${trigger.stateType})`;

	const conditions = payload?.conditions;
	const conditionSummary =
		conditions && conditions.rules.length > 0
			? conditions.rules
					.map(
						(rule) =>
							`${describeDevice(rule.deviceId, devicesById)} (${PROPERTY_LABELS[rule.property]}) ${COMPARISON_LABELS[rule.comparison]} ${describeConditionValue(rule.property, rule.value, devicesById)}`,
					)
					.join(conditions.operator === "AND" ? " E " : " OU ")
			: null;

	const actionSummaries = (payload?.actions ?? []).map(
		(action) =>
			`${action.desiredState ? "Ligar" : "Desligar"} ${describeDevice(action.deviceId, devicesById)}`,
	);

	return {
		id: automation.id,
		name: automation.name,
		isActive: automation.isActive,
		isDraft: !trigger || actionSummaries.length === 0,
		triggerKind: isTimeTrigger ? "schedule" : "sensor",
		triggerSummary,
		conditionSummary,
		actionSummaries,
		rulePayload: automation.rulePayload,
		createdAt: automation.createdAt,
		updatedAt: automation.updatedAt,
	};
}
