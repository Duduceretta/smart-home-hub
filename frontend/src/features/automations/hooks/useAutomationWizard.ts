import { useReducer, useState } from "react";
import {
	automationFormReducer,
	DEFAULT_FORM_STATE,
	isActionsListValid,
	isTriggerConfigValid,
} from "../lib/automation-form-reducer";
import type {
	AutomationWizardState,
	DeviceTriggerConfig,
	ScheduleTriggerConfig,
	SensorTriggerConfig,
	TriggerSource,
	WizardAction,
	WizardStepNumber,
} from "../types/automation-wizard.types";

/**
 * Estado + validação por passo do wizard de criação. O núcleo (gatilho,
 * ações, nome, toggle) vem do reducer compartilhado com o formulário de
 * edição (`automation-form-reducer.ts`) — aqui só soma a navegação por
 * `step`, que não existe na edição.
 */
export function useAutomationWizard() {
	const [formState, dispatch] = useReducer(
		automationFormReducer,
		DEFAULT_FORM_STATE,
	);
	const [step, setStep] = useState<WizardStepNumber>(1);

	const state: AutomationWizardState = { ...formState, step };

	const hasProgress =
		formState.triggerSource !== null ||
		formState.actions.length > 0 ||
		formState.name.trim() !== "";

	return {
		state,
		isTriggerConfigValid: isTriggerConfigValid(formState),
		isActionsStepValid: isActionsListValid(formState),
		hasProgress,
		goToStep: (nextStep: WizardStepNumber) => setStep(nextStep),
		selectTriggerSource: (source: TriggerSource) =>
			dispatch({ type: "SELECT_TRIGGER_SOURCE", source }),
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
		reset: () => {
			dispatch({ type: "RESET" });
			setStep(1);
		},
	};
}

export type UseAutomationWizardReturn = ReturnType<typeof useAutomationWizard>;
