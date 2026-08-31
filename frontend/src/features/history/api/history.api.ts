import { apiClient } from "@/core/api/api.client";
import { handleApplicationError } from "@/core/errors/app.errors";
import type { PagedResponse } from "@/core/types/pagination.types";
import type {
	GetHistoryParams,
	GetHistoryStatsParams,
	HistoryEvent,
	HistoryKpiMetrics,
} from "../types/history.types";

/**
 * Fetches paginated historical audit events and system telemetry from `GET /api/history`.
 */
export async function getEventHistory(
	params: GetHistoryParams,
): Promise<PagedResponse<HistoryEvent>> {
	try {
		const { data } = await apiClient.get<PagedResponse<HistoryEvent>>(
			"/history",
			{
				params: {
					startDateUtc: params.startDateUtc,
					endDateUtc: params.endDateUtc,
					deviceId: params.deviceId,
					roomId: params.roomId,
					deviceGroupId: params.deviceGroupId,
					severity: params.severity,
					source: params.source,
					search: params.search,
					page: params.page ?? 1,
					pageSize: params.pageSize ?? 20,
				},
			},
		);

		return data;
	} catch (error: unknown) {
		throw handleApplicationError(
			error,
			"Não foi possível carregar a trilha de histórico e eventos.",
		);
	}
}

/**
 * Fetches aggregated KPI counts (total/automation/alert/group-action) over the
 * whole filtered period from `GET /api/history/stats` — unlike `getEventHistory`,
 * this is not limited to the current page of items.
 */
export async function getEventHistoryStats(
	params: GetHistoryStatsParams,
): Promise<HistoryKpiMetrics> {
	try {
		const { data } = await apiClient.get<HistoryKpiMetrics>("/history/stats", {
			params: {
				startDateUtc: params.startDateUtc,
				endDateUtc: params.endDateUtc,
				deviceId: params.deviceId,
				roomId: params.roomId,
				deviceGroupId: params.deviceGroupId,
				severity: params.severity,
				source: params.source,
				search: params.search,
			},
		});

		return data;
	} catch (error: unknown) {
		throw handleApplicationError(
			error,
			"Não foi possível carregar as estatísticas do histórico de eventos.",
		);
	}
}
