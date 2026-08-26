/**
 * Represents the automation read-model (AutomationDto) returned by the C# API.
 * `rulePayload` is the ECA tree serialized as a JSON string — never a nested
 * object in the HTTP envelope, mirroring how the backend stores/returns it.
 */
export interface Automation {
	id: string;
	name: string;
	isActive: boolean;
	rulePayload: string;
	schemaVersion: number;
	createdAt: string;
	updatedAt: string | null;
}

/**
 * Payload required to create a new automation (CreateAutomationRequest).
 */
export interface CreateAutomationPayload {
	name: string;
	rulePayload: string;
	isActive: boolean;
}

/**
 * Payload required to update an existing automation (UpdateAutomationRequest).
 */
export interface UpdateAutomationPayload {
	name: string;
	rulePayload: string;
	isActive: boolean;
}

/**
 * Minimal device shape used to populate the trigger/condition/action
 * device pickers in the automation form.
 */
export interface PickerDevice {
	id: string;
	name: string;
	brand: string;
	isOn: boolean;
}

// --- Estrutura ECA (Event-Condition-Action) do RulePayload ---
// Espelha 1:1 SmartHomeHub.Domain.ValueObjects.AutomationRules (backend).
// O backend desserializa com PropertyNameCaseInsensitive: true em todo
// lugar, então camelCase consistente aqui funciona mesmo nos campos de
// TimeTrigger/DeviceStateTrigger, que não têm [JsonPropertyName] explícito
// no C# (ficariam PascalCase por padrão, mas o case não importa na prática).

export type TriggerType = "time" | "device_state";

export interface TimeTrigger {
	type: "time";
	id: string;
	cronExpression: string;
}

export interface DeviceStateTrigger {
	type: "device_state";
	id: string;
	deviceId: string;
	stateType: string;
}

export type AutomationTrigger = TimeTrigger | DeviceStateTrigger;

export type ConditionProperty =
	| "isOn"
	| "temperature"
	| "powerUsageWatts"
	| "deviceId";

export type ConditionComparison = "==" | "!=" | ">" | ">=" | "<" | "<=";

export type ConditionValue = boolean | number | string;

export interface AutomationRule {
	deviceId: string;
	property: ConditionProperty;
	comparison: ConditionComparison;
	value: ConditionValue;
}

export type ConditionOperator = "AND" | "OR";

export interface AutomationConditionNode {
	operator: ConditionOperator;
	rules: AutomationRule[];
}

export interface AutomationAction {
	deviceId: string;
	desiredState: boolean;
}

export interface AutomationPayload {
	triggers: AutomationTrigger[];
	conditions: AutomationConditionNode | null;
	actions: AutomationAction[];
}
