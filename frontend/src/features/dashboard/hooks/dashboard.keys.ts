export const dashboardKeys = {
	all: ["dashboard"] as const,
	overview: () => [...dashboardKeys.all, "overview"] as const,
	activityLogs: () => [...dashboardKeys.all, "activity-log"] as const,
	activityLog: (page: number, pageSize: number) =>
		[...dashboardKeys.activityLogs(), { page, pageSize }] as const,
	automationsSummary: () =>
		[...dashboardKeys.all, "automations-summary"] as const,
};
