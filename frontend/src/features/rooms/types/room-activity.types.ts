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
