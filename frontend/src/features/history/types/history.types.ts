/**
 * Event source origins, mirroring the backend C# enum (EventSource) contract,
 * which is serialized as string (.ToString()) — never as a numeric value.
 */
export type EventSourceName =
	| "Automation"
	| "UserManual"
	| "System"
	| "DeviceGroup";

/**
 * Event severity levels, mirroring the backend C# enum (EventSeverity) contract,
 * which is serialized as string (.ToString()) — never as a numeric value.
 */
export type EventSeverityName = "Info" | "Warning" | "Error" | "Critical";

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
	source: EventSourceName | string;
	severity: EventSeverityName | string;
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
	severity?: EventSeverityName;
	source?: EventSourceName;
	search?: string;
	page?: number;
	pageSize?: number;
}

/**
 * Parameters for querying aggregated event history stats via `GET /api/history/stats`.
 * Same filter contract as `GetHistoryParams`, without pagination.
 */
export type GetHistoryStatsParams = Omit<GetHistoryParams, "page" | "pageSize">;

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
