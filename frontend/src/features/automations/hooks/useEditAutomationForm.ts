import { useEffect, useReducer, useRef } from "react";
import { mapAutomationToFormState } from "../lib/automation-edit-state.mapper";
import {
	automationFormReducer,
	DEFAULT_FORM_STATE,
	isActionsListValid,
	isTriggerConfigValid,
} from "../lib/automation-form-reducer";
import type {
	AutomationFormState,
	DeviceTriggerConfig,
	ScheduleTriggerConfig,
	SensorTriggerConfig,
	WizardAction,
} from "../types/automation-wizard.types";
import type { Automation } from "../types/automations.types";

/**
 * Estado do formulário de edição — mesmo núcleo (reducer) do wizard de
 * criação, mas sem `step` e sem trocar `triggerSource` depois de
 * inicializado (o tipo de gatilho é fixo na edição, não é mais um passo
 * navegável). Inicializa a partir de uma `Automation` recebida por prop
 * (sem fetch próprio) e mantém uma referência ao snapshot original pra
 * `hasChanges` — comparação rasa via JSON.stringify é suficiente aqui
 * porque todo o estado é feito de primitivos/arrays simples, sem
 * referências circulares nem funções.
 */
export function useEditAutomationForm(automation: Automation | null) {
	const initialStateRef = useRef<AutomationFormState>(DEFAULT_FORM_STATE);
	const [state, dispatch] = useReducer(
		automationFormReducer,
		DEFAULT_FORM_STATE,
	);

	useEffect(() => {
		if (!automation) return;
		const mapped = mapAutomationToFormState(automation);
		initialStateRef.current = mapped;
		dispatch({ type: "RESET", state: mapped });
	}, [automation]);

	const hasChanges =
		JSON.stringify(state) !== JSON.stringify(initialStateRef.current);

	return {
		state,
		hasChanges,
		isTriggerConfigValid: isTriggerConfigValid(state),
		isActionsListValid: isActionsListValid(state),
		updateSensorConfig: (patch: Partial<SensorTriggerConfig>) =>
			dispatch({ type: "UPDATE_SENSOR_CONFIG", patch }),
		updateDeviceConfig: (patch: Partial<DeviceTriggerConfig>) =>
			dispatch({ type: "UPDATE_DEVICE_CONFIG", patch }),
		updateScheduleConfig: (patch: Partial<ScheduleTriggerConfig>) =>
			dispatch({ type: "UPDATE_SCHEDULE_CONFIG", patch }),
		toggleWeekday: (day: number) => dispatch({ type: "TOGGLE_WEEKDAY", day }),
		addOrUpdateAction: (action: WizardAction) =>
			dispatch({ type: "ADD_OR_UPDATE_ACTION", action }),
		editAction: (id: string | null) => dispatch({ type: "EDIT_ACTION", id }),
		removeAction: (id: string) => dispatch({ type: "REMOVE_ACTION", id }),
		setName: (name: string) => dispatch({ type: "SET_NAME", name }),
		setActivateImmediately: (value: boolean) =>
			dispatch({ type: "SET_ACTIVATE_IMMEDIATELY", value }),
		reset: () => dispatch({ type: "RESET", state: initialStateRef.current }),
	};
}

export type UseEditAutomationFormReturn = ReturnType<
	typeof useEditAutomationForm
>;
