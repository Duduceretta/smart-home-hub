import type {
	AutomationFormInput,
	AutomationFormOutput,
} from "../types/automation.schemas";
import type {
	Automation,
	AutomationPayload,
	AutomationRule,
	ConditionProperty,
} from "../types/automations.types";

function parseRuleValue(property: ConditionProperty, rawValue: string) {
	if (property === "isOn") return rawValue === "true";
	if (property === "temperature" || property === "powerUsageWatts")
		return Number(rawValue);
	return rawValue;
}

function serializeRuleValue(
	property: ConditionProperty,
	value: unknown,
): string {
	if (property === "isOn") return value === true ? "true" : "false";
	if (property === "temperature" || property === "powerUsageWatts")
		return String(value ?? 0);
	return typeof value === "string" ? value : "";
}

/**
 * Monta o AutomationPayload (formato exato que o backend espera dentro de
 * RulePayload) a partir dos campos estruturados do formulário.
 * `conditions: null` só existe aqui, na fronteira com a API — o form em si
 * sempre mantém `rules` como array (useFieldArray não lida bem com null).
 */
export function mapFormToRulePayload(
	form: AutomationFormOutput,
): AutomationPayload {
	const trigger =
		form.triggerType === "time"
			? {
					type: "time" as const,
					id: crypto.randomUUID(),
					cronExpression: form.cron ?? "",
				}
			: {
					type: "device_state" as const,
					id: crypto.randomUUID(),
					deviceId: form.triggerDeviceId ?? "",
					stateType: form.triggerStateType ?? "",
				};

	const rules: AutomationRule[] = form.rules.map((rule) => ({
		deviceId: rule.deviceId,
		property: rule.property,
		comparison: rule.comparison,
		value: parseRuleValue(rule.property, rule.value),
	}));

	return {
		triggers: [trigger],
		conditions:
			rules.length > 0 ? { operator: form.conditionOperator, rules } : null,
		actions: form.actions.map((action) => ({
			deviceId: action.deviceId,
			desiredState: action.desiredState === "true",
		})),
	};
}

/**
 * Desserializa `automation.rulePayload` (string JSON opaca vinda da API) e
 * normaliza pra shape do formulário — `conditions: null` vira `rules: []`
 * porque o RHF/useFieldArray precisa sempre de um array.
 */
export function mapAutomationToFormValues(
	automation: Automation,
): AutomationFormInput {
	let payload: AutomationPayload | null = null;
	try {
		payload = JSON.parse(automation.rulePayload) as AutomationPayload;
	} catch {
		payload = null;
	}

	const trigger = payload?.triggers?.[0];
	const isTimeTrigger = trigger?.type === "time";

	return {
		name: automation.name,
		isActive: automation.isActive,
		triggerType: isTimeTrigger ? "time" : "device_state",
		cron: isTimeTrigger ? trigger.cronExpression : "",
		triggerDeviceId:
			trigger && trigger.type === "device_state" ? trigger.deviceId : "",
		triggerStateType:
			trigger && trigger.type === "device_state" ? trigger.stateType : "",
		conditionOperator: payload?.conditions?.operator ?? "AND",
		rules: (payload?.conditions?.rules ?? []).map((rule) => ({
			deviceId: rule.deviceId,
			property: rule.property,
			comparison: rule.comparison,
			value: serializeRuleValue(rule.property, rule.value),
		})),
		actions: (payload?.actions ?? []).map((action) => ({
			deviceId: action.deviceId,
			desiredState: action.desiredState ? "true" : "false",
		})),
	};
}
