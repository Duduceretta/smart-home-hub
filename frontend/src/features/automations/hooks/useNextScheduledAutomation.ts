import { useQuery } from "@tanstack/react-query";
import { fetchNextScheduledAutomation } from "../api/automations.api";
import type { NextScheduledAutomation } from "../types/automations.types";
import { automationsKeys } from "./automations.keys";

/**
 * Próxima automação Schedule agendada (rodapé do hero da Home). Não é
 * tempo real — cron não muda minuto a minuto — `staleTime` de 5min é
 * suficiente; `AutomationExecutionResult` via SignalR já invalida
 * `automationsKeys.all` (ver `useRealtimeListener`), o que cobre esta key.
 */
export function useNextScheduledAutomation() {
	return useQuery<NextScheduledAutomation | null, Error>({
		queryKey: automationsKeys.nextScheduled(),
		queryFn: ({ signal }) => fetchNextScheduledAutomation(signal),
		staleTime: 1000 * 60 * 5,
		retry: 1,
	});
}
