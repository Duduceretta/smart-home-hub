/**
 * Represents the room read-model (RoomDto) returned by C# API queries.
 * automationCount vem pronto do back-end (GetRoomsQuery.cs já faz o
 * cruzamento RulePayload×dispositivo uma vez pra página inteira) — evita
 * cada item da lista precisar de uma requisição própria só pra contar.
 */
export interface Room {
	id: string;
	name: string;
	icon?: string | null;
	automationCount: number;
}

/**
 * Payload required to create a new room (CreateRoomRequest).
 */
export interface CreateRoomPayload {
	name: string;
	icon?: string | null;
}

/**
 * Payload required to update an existing room (UpdateRoomRequest).
 */
export interface UpdateRoomPayload {
	name: string;
	icon?: string | null;
}

export type RoomsViewMode = "cards" | "list";

/**
 * Formato mínimo de evento de atividade — espelha `ActivityLogEntry` da
 * feature `dashboard` (isolamento do FSD, mesmo padrão dos outros tipos
 * locais desta feature).
 */
export interface RoomActivityEntry {
	id: string;
	deviceId: string | null;
	eventType:
		| "DeviceStatus"
		| "DeviceMedia"
		| "Spotify"
		| "AutomationExecuted"
		| string;
	title: string;
	description: string;
	timestamp: string;
	isAlert: boolean;
}

export type RoomAutomationTriggerKind = "schedule" | "sensor" | "unknown";

/**
 * Espelha `RoomAutomationDto` (GetRoomAutomationsQuery.cs) — o cruzamento
 * com os dispositivos do ambiente já vem pronto do back-end.
 */
export interface RoomLinkedAutomation {
	id: string;
	name: string;
	isActive: boolean;
	triggerKind: RoomAutomationTriggerKind;
}

/**
 * Espelha `RoomClimateResponseDto` (GetRoomClimateQuery.cs). hasClimateSensor
 * indica se existe algum Sensor/Termostato no ambiente — quando falso, as
 * outras leituras vêm sempre nulas e a seção de clima deve ser omitida por
 * completo (sem espaço reservado), não só mostrar "--".
 */
export interface RoomClimate {
	hasClimateSensor: boolean;
	temperatureCelsius: number | null;
	humidityPercent: number | null;
	readingTimestampUtc: string | null;
}

/**
 * Formato mínimo de dispositivo usado pelo seletor de atribuição de
 * dispositivos do formulário de Ambiente. Deliberadamente não é o `Device`
 * da feature `devices` (isolamento do FSD — mesmo padrão do `PickerDevice`
 * em `device-groups.types.ts`). `type`/`integrationType` ficam como
 * `number` cru (espelham o `DeviceTypeEnum`/`IntegrationTypeEnum` do C#,
 * ver `devices.types.ts` na feature `devices`) — não reimportamos o enum
 * pra não acoplar as duas features.
 */
export interface RoomPickerDevice {
	id: string;
	name: string;
	brand: string;
	externalId: string;
	type: number;
	integrationType: number;
	roomId: string | null;
	isOnline: boolean;
	isOn: boolean;
}

/**
 * Payload mínimo aceito por `PUT /devices/{id}` (UpdateDeviceRequest no C#)
 * pra realocar um dispositivo de ambiente. Campos sensíveis/de rede
 * (ipAddress, macAddress, localKey, etc.) ficam de fora — o back-end
 * preserva o valor já salvo quando o campo não é enviado, não apaga.
 */
export interface RoomDeviceAssignmentPayload {
	name: string;
	brand: string;
	externalId: string;
	type: number;
	integrationType: number;
	roomId: string | null;
}

export type RoomEnergyRange = "24h" | "7d";

/**
 * Espelha `RoomEnergyChartPointDto`/`RoomEnergyResponseDto`
 * (GetRoomEnergyQuery.cs). `value` é potência MÉDIA (kW) do balde de 5min,
 * já somando só os dispositivos deste ambiente.
 */
export interface RoomEnergyChartPoint {
	timestamp: string;
	value: number;
	isEstimated: boolean;
}

export interface RoomEnergy {
	hasEnergyData: boolean;
	chart: RoomEnergyChartPoint[];
	totalConsumptionKwh: number;
	isEnergyEstimated: boolean;
}

/** Espelha `RoomBulkPowerResultDto` (SetRoomDevicesPowerCommand.cs). */
export interface RoomBulkPowerResult {
	succeededCount: number;
	failedCount: number;
	totalCount: number;
}
