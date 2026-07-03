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
	recentActivities: RecentEvent[];
}
