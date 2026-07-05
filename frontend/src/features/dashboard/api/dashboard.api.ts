import { apiClient } from "@/core/api/api.client";
import { Logger } from "@/core/logger/app.logger";
import type { DashboardOverviewResponse } from "../types/dashboard.types";

export const fetchDashboardOverview =
	async (): Promise<DashboardOverviewResponse> => {
		try {
			const response = await apiClient.get<DashboardOverviewResponse>(
				"/dashboard/overview",
			);

			return response.data;
		} catch (error: unknown) {
			Logger.error("Falha ao buscar os dados consolidados do dashboard", error);
			throw new Error(
				"Não foi possível carregar as informações do painel no momento.",
			);
		}
	};
