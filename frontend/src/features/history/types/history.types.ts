/**
 * Event severity levels mirroring the backend C# enum (EventSeverity).
 */
export const EventSeverity = {
	Info: 1,
	Warning: 2,
	Error: 3,
	Critical: 4,
} as const;

export type EventSeverityType =
	(typeof EventSeverity)[keyof typeof EventSeverity];

/**
 * Event source origins mirroring the backend C# enum (EventSource).
 */
export const EventSource = {
	Automation: 1,
	UserManual: 2,
	System: 3,
	DeviceGroup: 4,
} as const;

export type EventSourceType = (typeof EventSource)[keyof typeof EventSource];

/**
 * Individual historical event DTO (EventHistoryDto) returned by `GET /api/history`.
 */
export interface HistoryEvent {
	id: string;
	timestampUtc: string;
	eventType: string;
	description: string;
	deviceId?: string | null;
	deviceName?: string | null;
	roomId?: string | null;
	roomName?: string | null;
	deviceGroupId?: string | null;
	deviceGroupName?: string | null;
	source: "Automation" | "UserManual" | "System" | "DeviceGroup" | string;
	severity: "Info" | "Warning" | "Error" | "Critical" | string;
	oldValue?: string | null;
	newValue?: string | null;
}

/**
 * Parameters for querying historical events via `GET /api/history`.
 */
export interface GetHistoryParams {
	startDateUtc: string;
	endDateUtc: string;
	deviceId?: string;
	roomId?: string;
	deviceGroupId?: string;
	severity?: number | string;
	source?: number | string;
	search?: string;
	page?: number;
	pageSize?: number;
}

/**
 * Timeframe presets for the UI filter.
 */
export type HistoryTimeframePreset = "24h" | "7d" | "30d" | "custom" | "all";

/**
 * Aggregated KPI metrics for the events in view.
 */
export interface HistoryKpiMetrics {
	totalEvents: number;
	automationCount: number;
	alertCount: number;
	groupActionCount: number;
}
