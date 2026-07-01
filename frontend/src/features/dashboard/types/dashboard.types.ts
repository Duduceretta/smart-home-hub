export interface EnergyDataPoint {
    time: string;
    value: number;
}

export interface RoomDataPoint {
    name: string;
    value: number;
}

export interface RecentActivity {
    id: string;
    type: "climate" | "lighting" | "security" | "cleaning";
    title: string;
    description: string;
    timestamp: string;
}

export interface DashboardMetrics {
    totalEnergyConsumption: number;
    activeDevicesCount: number;
    totalDevicesCount: number;
    averageTemperature: number;
    temperatureTrend: number;
    securityAlerts: number;
    energyChart: EnergyDataPoint[];
    roomDistribution: RoomDataPoint[];
    recentActivities: RecentActivity[];
}
