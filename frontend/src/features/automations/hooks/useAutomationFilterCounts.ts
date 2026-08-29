import { useQuery } from "@tanstack/react-query";
import { fetchAutomationFilterCounts } from "../api/automations.api";
import type { AutomationFilterCounts } from "../types/automations.types";
import { automationsKeys } from "./automations.keys";

/**
 * Contagens por categoria (trilha de filtro + barra de resumo) — query
 * própria e independente da listagem paginada. Invalidada junto com
 * `automationsKeys.lists()` (create/update/delete), não a cada troca de
 * filtro/busca (o total de automações não muda por isso).
 */
export function useAutomationFilterCounts() {
	return useQuery<AutomationFilterCounts, Error>({
		queryKey: automationsKeys.filterCounts(),
		queryFn: fetchAutomationFilterCounts,
		staleTime: 1000 * 30,
		retry: 1,
	});
}
