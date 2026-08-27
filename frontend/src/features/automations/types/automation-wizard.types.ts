import type { ConditionComparison } from "./automations.types";

/**
 * "Origem do gatilho" — categorias que o usuário escolhe no Passo 1 do
 * wizard. Não existe 1:1 com os tipos reais do backend: `sensor` e
 * `device` viram os dois o MESMO tipo de trigger (`device_state`) +
 * uma condição — a diferença entre eles é só qual propriedade fica em
 * destaque (sensor = métrica numérica, device = estado ligado/desligado).
 * `schedule` é o único que gera um `TimeTrigger` (cron) de verdade.
 * `location` não tem nenhum suporte no backend hoje (sem geofencing no
 * domínio) — fica no grid por completude de UX, mas desabilitado.
 */
export type TriggerSource = "sensor" | "device" | "location" | "schedule";

export type SensorMetric = "temperature" | "powerUsageWatts";

export interface SensorTriggerConfig {
	deviceId: string;
	metric: SensorMetric;
	comparison: ConditionComparison;
	value: string;
}

export interface DeviceTriggerConfig {
	deviceId: string;
	desiredIsOn: boolean;
}

/** `weekdays` usa a mesma numeração do cron padrão: 0 = domingo ... 6 = sábado. */
export interface ScheduleTriggerConfig {
	time: string;
	weekdays: number[];
}

export interface WizardAction {
	id: string;
	deviceId: string;
	desiredState: boolean;
}

export type WizardStepNumber = 1 | 2 | 3 | 4;

/**
 * Núcleo de estado compartilhado entre o wizard de criação e o formulário
 * de edição — tudo que não é navegação por passo. Os dois fluxos montam o
 * mesmo `AutomationPayload` a partir daqui (ver
 * `automation-wizard-payload.mapper.ts`), então o shape é único: o wizard
 * só soma `step` em cima (`AutomationWizardState`), e a edição usa este
 * tipo puro, sem step nenhum (o gatilho já vem escolhido, não é mais um
 * passo navegável).
 */
export interface AutomationFormState {
	triggerSource: TriggerSource | null;
	sensorConfig: SensorTriggerConfig;
	deviceConfig: DeviceTriggerConfig;
	scheduleConfig: ScheduleTriggerConfig;
	actions: WizardAction[];
	editingActionId: string | null;
	name: string;
	activateImmediately: boolean;
}

export interface AutomationWizardState extends AutomationFormState {
	step: WizardStepNumber;
}

/**
 * Shape mínimo que `TriggerConfigStep`/`ActionsStep` precisam pra funcionar
 * — satisfeito tanto por `UseAutomationWizardReturn` quanto por
 * `UseEditAutomationFormReturn` (tipagem estrutural: cada hook tem campos
 * extras próprios — `step`/`goToStep` no wizard, `hasChanges`/`reset` na
 * edição —, mas ambos cobrem isto aqui). Permite os dois passos serem
 * usados sem duplicar componente entre criação e edição.
 */
export interface AutomationFormController {
	state: AutomationFormState;
	updateSensorConfig: (patch: Partial<SensorTriggerConfig>) => void;
	updateDeviceConfig: (patch: Partial<DeviceTriggerConfig>) => void;
	updateScheduleConfig: (patch: Partial<ScheduleTriggerConfig>) => void;
	toggleWeekday: (day: number) => void;
	addOrUpdateAction: (action: WizardAction) => void;
	editAction: (id: string | null) => void;
	removeAction: (id: string) => void;
}
