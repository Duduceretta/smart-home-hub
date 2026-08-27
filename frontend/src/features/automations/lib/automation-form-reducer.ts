import type {
	AutomationFormState,
	DeviceTriggerConfig,
	ScheduleTriggerConfig,
	SensorTriggerConfig,
	TriggerSource,
	WizardAction,
} from "../types/automation-wizard.types";

export const DEFAULT_SENSOR_CONFIG: SensorTriggerConfig = {
	deviceId: "",
	metric: "temperature",
	comparison: ">",
	value: "",
};

export const DEFAULT_DEVICE_CONFIG: DeviceTriggerConfig = {
	deviceId: "",
	desiredIsOn: true,
};

export const DEFAULT_SCHEDULE_CONFIG: ScheduleTriggerConfig = {
	time: "",
	weekdays: [0, 1, 2, 3, 4, 5, 6],
};

export const DEFAULT_FORM_STATE: AutomationFormState = {
	triggerSource: null,
	sensorConfig: DEFAULT_SENSOR_CONFIG,
	deviceConfig: DEFAULT_DEVICE_CONFIG,
	scheduleConfig: DEFAULT_SCHEDULE_CONFIG,
	actions: [],
	editingActionId: null,
	name: "",
	activateImmediately: true,
};

export type AutomationFormAction =
	| { type: "SELECT_TRIGGER_SOURCE"; source: TriggerSource }
	| { type: "UPDATE_SENSOR_CONFIG"; patch: Partial<SensorTriggerConfig> }
	| { type: "UPDATE_DEVICE_CONFIG"; patch: Partial<DeviceTriggerConfig> }
	| { type: "UPDATE_SCHEDULE_CONFIG"; patch: Partial<ScheduleTriggerConfig> }
	| { type: "TOGGLE_WEEKDAY"; day: number }
	| { type: "ADD_OR_UPDATE_ACTION"; action: WizardAction }
	| { type: "EDIT_ACTION"; id: string | null }
	| { type: "REMOVE_ACTION"; id: string }
	| { type: "SET_NAME"; name: string }
	| { type: "SET_ACTIVATE_IMMEDIATELY"; value: boolean }
	| { type: "RESET"; state?: AutomationFormState };

/**
 * Núcleo do reducer compartilhado entre o wizard de criação
 * (`useAutomationWizard`) e o formulário de edição (`useEditAutomationForm`)
 * — as duas telas montam o mesmo `AutomationPayload` a partir do mesmo
 * shape de estado (`AutomationFormState`), então a lógica de transição só
 * existe uma vez. O wizard soma navegação por `step` por cima; a edição usa
 * isso puro, sem step.
 */
export function automationFormReducer(
	state: AutomationFormState,
	action: AutomationFormAction,
): AutomationFormState {
	switch (action.type) {
		case "SELECT_TRIGGER_SOURCE":
			return { ...state, triggerSource: action.source };
		case "UPDATE_SENSOR_CONFIG":
			return {
				...state,
				sensorConfig: { ...state.sensorConfig, ...action.patch },
			};
		case "UPDATE_DEVICE_CONFIG":
			return {
				...state,
				deviceConfig: { ...state.deviceConfig, ...action.patch },
			};
		case "UPDATE_SCHEDULE_CONFIG":
			return {
				...state,
				scheduleConfig: { ...state.scheduleConfig, ...action.patch },
			};
		case "TOGGLE_WEEKDAY": {
			// Calcula o próximo array de dias em cima do `state` que o
			// reducer recebe (sempre atualizado, mesmo com dois dispatches
			// disparados no mesmo tick) — em vez de receber o array pronto
			// de fora, onde dois cliques síncronos leriam o mesmo
			// `weekdays` desatualizado e o segundo sobrescreveria o
			// primeiro.
			const { weekdays } = state.scheduleConfig;
			const nextWeekdays = weekdays.includes(action.day)
				? weekdays.filter((d) => d !== action.day)
				: [...weekdays, action.day];
			return {
				...state,
				scheduleConfig: { ...state.scheduleConfig, weekdays: nextWeekdays },
			};
		}
		case "ADD_OR_UPDATE_ACTION": {
			const exists = state.actions.some((a) => a.id === action.action.id);
			return {
				...state,
				actions: exists
					? state.actions.map((a) =>
							a.id === action.action.id ? action.action : a,
						)
					: [...state.actions, action.action],
				editingActionId: null,
			};
		}
		case "EDIT_ACTION":
			return { ...state, editingActionId: action.id };
		case "REMOVE_ACTION":
			return {
				...state,
				actions: state.actions.filter((a) => a.id !== action.id),
			};
		case "SET_NAME":
			return { ...state, name: action.name };
		case "SET_ACTIVATE_IMMEDIATELY":
			return { ...state, activateImmediately: action.value };
		case "RESET":
			return action.state ?? DEFAULT_FORM_STATE;
		default:
			return state;
	}
}

export function isTriggerConfigValid(state: AutomationFormState): boolean {
	if (state.triggerSource === "sensor") {
		return (
			state.sensorConfig.deviceId.trim() !== "" &&
			state.sensorConfig.value.trim() !== "" &&
			!Number.isNaN(Number(state.sensorConfig.value))
		);
	}
	if (state.triggerSource === "device") {
		return state.deviceConfig.deviceId.trim() !== "";
	}
	if (state.triggerSource === "schedule") {
		return (
			state.scheduleConfig.time.trim() !== "" &&
			state.scheduleConfig.weekdays.length > 0
		);
	}
	return false;
}

export function isActionsListValid(state: AutomationFormState): boolean {
	return state.actions.length > 0;
}

export function isNameValid(state: AutomationFormState): boolean {
	return state.name.trim().length > 0 && state.name.trim().length <= 150;
}
