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

export interface RoomEnergyUsage {
	name: string;
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
	 * Não consumido pela UI — a Activity Log Timeline usa o buffer client-side
	 * de `dashboard-activity.store.ts`, alimentado via SignalR em tempo real.
	 * Mantido no contrato porque o backend ainda retorna o campo.
	 */
	recentActivities: RecentEvent[];
}

export type ActivityEventKind = "device-status" | "device-media" | "spotify";

export interface ActivityLogEntry {
	id: string;
	kind: ActivityEventKind;
	deviceId?: string;
	title: string;
	description: string;
	occurredAt: string;
}
