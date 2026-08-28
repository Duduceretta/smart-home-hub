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
