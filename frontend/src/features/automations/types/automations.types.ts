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
	/**
	 * Timestamp da última execução (sucesso ou falha) registrada pelo backend
	 * como SystemEvent(AutomationExecuted). Null = nunca executou. Derivado
	 * no backend a partir do log de atividade, não é uma coluna própria.
	 */
	lastExecutedAt: string | null;
	/** true se alguma execução de hoje (UTC) falhou. */
	hasFailedToday: boolean;
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

/**
 * Modelo de exibição derivado de `Automation` + a lista de dispositivos —
 * resume o `rulePayload` (JSON opaco) em texto legível pra lista/detalhe.
 * Não inclui histórico de execução: o backend ainda não rastreia isso (ver
 * `DeviceTelemetryLog`/roadmap), então a UI não finge ter esse dado.
 */
export interface AutomationView {
	id: string;
	name: string;
	isActive: boolean;
	isDraft: boolean;
	triggerKind: "schedule" | "sensor";
	triggerSummary: string;
	conditionSummary: string | null;
	actionSummaries: string[];
	rulePayload: string;
	createdAt: string;
	updatedAt: string | null;
	lastExecutedAt: string | null;
	hasFailedToday: boolean;
}

/**
 * Uma execução registrada (sucesso ou falha) — espelha ActivityLogEntryDto
 * do backend, servido tanto por `GET /automations/{id}/history` quanto (a
 * mesma linha, resumida) pela Linha do Tempo global do dashboard.
 */
export interface AutomationExecutionEvent {
	id: string;
	deviceId: string | null;
	eventType: string;
	title: string;
	description: string;
	timestamp: string;
	isAlert: boolean;
}

/** Contagem de execuções por dia da semana — sempre os 7 dias, zerados quando não há execução. */
export interface AutomationWeekdayExecutionCount {
	dayOfWeek: number;
	count: number;
}

// --- Tipos de estado efêmero de UI (lista/filtros) ---
// Vivem aqui (não dentro dos componentes que os usam) porque tanto a store
// Zustand quanto os componentes de apresentação (AutomationFilterChips,
// AutomationListPanel) precisam importá-los — definir num componente e o
// outro lado importar de lá criaria uma dependência invertida.

export type AutomationFilter =
	| "all"
	| "active"
	| "inactive"
	| "schedule"
	| "sensor"
	| "draft";

export type AutomationSort = "name" | "status";

export type AutomationViewMode = "cards" | "list";
