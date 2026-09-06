import { DASHBOARD_QUERY_ROOT } from "@/core/constants/query-key-roots";

export const dashboardKeys = {
	all: DASHBOARD_QUERY_ROOT,
	overview: () => [...dashboardKeys.all, "overview"] as const,
	activityLogs: () => [...dashboardKeys.all, "activity-log"] as const,
	activityLog: (page: number, pageSize: number) =>
		[...dashboardKeys.activityLogs(), { page, pageSize }] as const,
	automationsSummary: () =>
		[...dashboardKeys.all, "automations-summary"] as const,
};
