import type {
	AutomationFormState,
	WizardAction,
} from "../types/automation-wizard.types";
import type {
	AutomationAction,
	AutomationConditionNode,
	AutomationPayload,
	AutomationRule,
	AutomationTrigger,
	CreateAutomationPayload,
	UpdateAutomationPayload,
} from "../types/automations.types";

const WEEKDAY_CRON_ORDER = [0, 1, 2, 3, 4, 5, 6];

/**
 * "HH:mm" + dias da semana (0=domingo..6=sábado, mesma numeração do cron
 * padrão) → expressão de 5 campos. Todos os 7 dias vira `*` (mais legível e
 * mais barato de casar no Cronos do que "0,1,2,3,4,5,6").
 */
function buildCronExpression(time: string, weekdays: number[]): string {
	const [hour, minute] = time.split(":").map(Number);
	const sortedDays = WEEKDAY_CRON_ORDER.filter((day) => weekdays.includes(day));
	const dayField = sortedDays.length === 7 ? "*" : sortedDays.join(",");
	return `${minute} ${hour} * * ${dayField}`;
}

/**
 * O engine (`AutomationConditionCompiler`) só compara a propriedade lida do
 * EVENTO que chegou (qualquer dispositivo) — ele NÃO filtra automaticamente
 * pelo `deviceId` de cada regra, exceto quando a própria regra usa
 * `property: "deviceId"`. Por isso toda condição de sensor/dispositivo
 * precisa vir em par, combinado por AND: uma regra igualando o dispositivo
 * escolhido, e outra comparando a propriedade de fato — sem isso, a
 * automação dispararia pra QUALQUER dispositivo que emitisse aquele tipo de
 * leitura, não só o selecionado no wizard.
 */
function buildDeviceScopedConditions(
	deviceId: string,
	propertyRule: Omit<AutomationRule, "deviceId">,
): AutomationConditionNode {
	return {
		operator: "AND",
		rules: [
			{ deviceId, property: "deviceId", comparison: "==", value: deviceId },
			{ deviceId, ...propertyRule },
		],
	};
}

function buildTrigger(state: AutomationFormState): AutomationTrigger {
	if (state.triggerSource === "schedule") {
		return {
			type: "time",
			id: crypto.randomUUID(),
			cronExpression: buildCronExpression(
				state.scheduleConfig.time,
				state.scheduleConfig.weekdays,
			),
		};
	}

	if (state.triggerSource === "sensor") {
		return {
			type: "device_state",
			id: crypto.randomUUID(),
			deviceId: state.sensorConfig.deviceId,
			stateType: state.sensorConfig.metric,
		};
	}

	// "device" — location não chega aqui (card fica desabilitado no Passo 1).
	return {
		type: "device_state",
		id: crypto.randomUUID(),
		deviceId: state.deviceConfig.deviceId,
		stateType: "isOn",
	};
}

function buildConditions(
	state: AutomationFormState,
): AutomationConditionNode | null {
	if (state.triggerSource === "schedule") {
		// Conditions precisa ficar null pra um gatilho de horário: o job do
		// Hangfire avalia com um contexto vazio (ver AutomationTimeTriggerJob),
		// então qualquer condição de dispositivo aqui NUNCA passaria.
		return null;
	}

	if (state.triggerSource === "sensor") {
		const { deviceId, metric, comparison, value } = state.sensorConfig;
		return buildDeviceScopedConditions(deviceId, {
			property: metric,
			comparison,
			value: Number(value),
		});
	}

	const { deviceId, desiredIsOn } = state.deviceConfig;
	return buildDeviceScopedConditions(deviceId, {
		property: "isOn",
		comparison: "==",
		value: desiredIsOn,
	});
}

function mapWizardAction(action: WizardAction): AutomationAction {
	return { deviceId: action.deviceId, desiredState: action.desiredState };
}

/**
 * Monta `{ name, rulePayload, isActive }` a partir do estado do formulário
 * (wizard de criação OU formulário de edição — mesmo shape, `AutomationFormState`)
 * — ponto único onde o modelo de UI (4 origens de gatilho) vira o
 * `AutomationPayload` real que o backend entende (2 tipos de trigger).
 * `CreateAutomationPayload`/`UpdateAutomationPayload` são estruturalmente
 * idênticos, então uma função só serve os dois fluxos.
 */
function mapFormStateToPayload(
	state: AutomationFormState,
): CreateAutomationPayload {
	const payload: AutomationPayload = {
		triggers: [buildTrigger(state)],
		conditions: buildConditions(state),
		actions: state.actions.map(mapWizardAction),
	};

	return {
		name: state.name.trim(),
		rulePayload: JSON.stringify(payload),
		isActive: state.activateImmediately,
	};
}

export function mapWizardStateToCreatePayload(
	state: AutomationFormState,
): CreateAutomationPayload {
	return mapFormStateToPayload(state);
}

export function mapFormStateToUpdatePayload(
	state: AutomationFormState,
): UpdateAutomationPayload {
	return mapFormStateToPayload(state);
}
