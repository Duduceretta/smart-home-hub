import { apiClient } from "@/core/api/api.client";
import { handleApplicationError } from "@/core/errors/app.errors";
import type { PagedResponse } from "@/core/types/pagination.types";
import type {
	ActivityLogEntry,
	DashboardOverviewResponse,
} from "../types/dashboard.types";

/**
 * Fetches the aggregated dashboard overview (summary KPIs, energy chart,
 * room usage and recent activities) for the authenticated user.
 */
export async function fetchDashboardOverview(): Promise<DashboardOverviewResponse> {
	try {
		const { data } = await apiClient.get<DashboardOverviewResponse>(
			"/dashboard/overview",
		);
		return data;
	} catch (error: unknown) {
		throw handleApplicationError(
			error,
			"Não foi possível carregar os dados da dashboard.",
		);
	}
}

/**
 * Fetches a page of the persisted activity log (SystemEvent).
 */
export async function fetchActivityLog(
	page: number,
	pageSize: number,
): Promise<PagedResponse<ActivityLogEntry>> {
	try {
		const { data } = await apiClient.get<PagedResponse<ActivityLogEntry>>(
			"/dashboard/activity-log",
			{ params: { page, pageSize } },
		);
		return data;
	} catch (error: unknown) {
		throw handleApplicationError(
			error,
			"Não foi possível carregar a linha do tempo de atividades.",
		);
	}
}
