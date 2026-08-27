import type {
	ActivityLogEntry,
	DashboardOverviewResponse,
} from "@/features/dashboard/types/dashboard.types";

export function createDashboardOverviewMock(
	overrides?: Partial<DashboardOverviewResponse>,
): DashboardOverviewResponse {
	const defaultMock: DashboardOverviewResponse = {
		summary: {
			totalDevicesCount: 5,
			onlineDevicesCount: 4,
			energyConsumptionKwh: 0.13,
			isEnergyEstimated: false,
			averageTemperatureCelsius: 23,
			temperatureTrend: 1.2,
			activeAlertsCount: 0,
		},
		energyChart: [
			{
				timestamp: "2026-08-26T12:00:00Z",
				value: 0.12,
				isEstimated: false,
			},
			{
				timestamp: "2026-08-26T12:05:00Z",
				value: 0.15,
				isEstimated: false,
			},
		],
		roomUsage: [{ roomId: "room-01", value: 0.13, isEstimated: false }],
		recentActivities: [],
	};

	return {
		...defaultMock,
		...overrides,
		summary: { ...defaultMock.summary, ...overrides?.summary },
	};
}

export function createActivityLogEntryMock(
	overrides?: Partial<ActivityLogEntry>,
): ActivityLogEntry {
	const defaultMock: ActivityLogEntry = {
		id: "event-test-123",
		deviceId: "device-test-123",
		eventType: "DeviceStatus",
		title: "Lâmpada da Sala ligado",
		description: "Ambiente: Sala de Estar",
		timestamp: "2026-08-26T12:00:00Z",
		isAlert: false,
	};

	return {
		...defaultMock,
		...overrides,
	};
}
