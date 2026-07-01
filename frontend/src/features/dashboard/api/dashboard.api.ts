import { apiClient } from "@/core/api/api.client";
import type { DashboardMetrics } from "../types/dashboard.types";

export const fetchDashboardMetrics = async (): Promise<DashboardMetrics> => {
	try {
		const response =
			await apiClient.get<DashboardMetrics>("/dashboard/metrics");

		return response.data;
	} catch (error) {
		console.error("Falha ao buscar métricas do dashboard", error);
		throw new Error("Não foi possível carregar os dados do painel no momento.");
	}
};
