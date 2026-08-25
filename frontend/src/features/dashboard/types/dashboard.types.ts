export interface DashboardSummary {
	totalDevicesCount: number;
	onlineDevicesCount: number;
	energyConsumptionKwh: number;
	averageTemperatureCelsius: number;
	temperatureTrend: number;
	activeAlertsCount: number;
}

export interface EnergyChartPoint {
	timestamp: string;
	value: number;
}

/**
 * roomId nulo = bucket "Sem Ambiente" (dispositivos sem cômodo atribuído).
 */
export interface RoomEnergyUsage {
	roomId: string | null;
	value: number;
}

export interface RecentEvent {
	id: string;
	timestamp: string;
	title: string;
	description: string;
	eventType: "Climate" | "Lighting" | "Security" | "System" | string;
}

export interface DashboardOverviewResponse {
	summary: DashboardSummary;
	energyChart: EnergyChartPoint[];
	roomUsage: RoomEnergyUsage[];
	/**
	 * Não consumido pela UI — a Linha do Tempo usa o endpoint dedicado e
	 * paginado `GET /api/dashboard/activity-log` (ver `useActivityLog`).
	 * Mantido no contrato porque o backend ainda retorna o campo.
	 */
	recentActivities: RecentEvent[];
}

/**
 * Espelha `ActivityEventTypes` em
 * `Features/Dashboards/ActivityLog/ActivityLogMessages.cs` (backend).
 */
export type ActivityEventType = "DeviceStatus" | "DeviceMedia" | "Spotify";

/**
 * Entrada real da Linha do Tempo — persistida como SystemEvent no backend,
 * servida por `GET /api/dashboard/activity-log`.
 */
export interface ActivityLogEntry {
	id: string;
	deviceId: string | null;
	eventType: ActivityEventType;
	title: string;
	description: string;
	timestamp: string;
}
