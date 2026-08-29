import { apiClient } from "@/core/api/api.client";
import { handleApplicationError } from "@/core/errors/app.errors";
import type { PagedResponse } from "@/core/types/pagination.types";
import type { AutomationsListFilters } from "../hooks/automations.keys";
import type {
	Automation,
	AutomationExecutionEvent,
	AutomationFilterCounts,
	AutomationWeekdayExecutionCount,
	CreateAutomationPayload,
	UpdateAutomationPayload,
} from "../types/automations.types";

export interface FetchAutomationsParams extends AutomationsListFilters {
	page?: number;
	pageSize?: number;
}

/**
 * Fetches automations owned by the authenticated user — filtro
 * (status/gatilho/rascunho), busca e ordenação todos resolvidos
 * server-side, sem filtragem/paginação client-side (mesmo padrão de
 * `fetchDevices`).
 */
export async function fetchAutomations({
	search,
	status,
	triggerKind,
	isDraft,
	sort,
	page = 1,
	pageSize = 10,
}: FetchAutomationsParams = {}): Promise<PagedResponse<Automation>> {
	try {
		const { data } = await apiClient.get<PagedResponse<Automation>>(
			"/automations",
			{
				params: {
					q: search || undefined,
					status,
					triggerKind,
					isDraft,
					sort,
					page,
					pageSize,
				},
			},
		);
		return data;
	} catch (error: unknown) {
		throw handleApplicationError(
			error,
			"Não foi possível carregar a lista de automações.",
		);
	}
}

/**
 * Fetches the total + per-category counts (ativas/inativas/por horário/por
 * sensor/rascunhos) — independente da paginação, usado pela trilha de
 * filtro e pela barra de resumo.
 */
export async function fetchAutomationFilterCounts(): Promise<AutomationFilterCounts> {
	try {
		const { data } = await apiClient.get<AutomationFilterCounts>(
			"/automations/counts",
		);
		return data;
	} catch (error: unknown) {
		throw handleApplicationError(
			error,
			"Não foi possível carregar as contagens de automações.",
		);
	}
}

/**
 * Fetches the details of a specific automation by its unique identifier.
 * GET /:id retorna 404 sem body em produção — handleApplicationError já
 * cai no fallback genérico nesse caso.
 */
export async function fetchAutomationById(id: string): Promise<Automation> {
	try {
		const { data } = await apiClient.get<Automation>(`/automations/${id}`);
		return data;
	} catch (error: unknown) {
		throw handleApplicationError(
			error,
			"Não foi possível encontrar os detalhes da automação solicitada.",
		);
	}
}

/**
 * Fetches the paginated execution history (success/failure) of an automation.
 */
export async function fetchAutomationExecutionHistory(
	automationId: string,
	page = 1,
	pageSize = 10,
): Promise<PagedResponse<AutomationExecutionEvent>> {
	try {
		const { data } = await apiClient.get<
			PagedResponse<AutomationExecutionEvent>
		>(`/automations/${automationId}/history`, { params: { page, pageSize } });
		return data;
	} catch (error: unknown) {
		throw handleApplicationError(
			error,
			"Não foi possível carregar o histórico de execução da automação.",
		);
	}
}

/**
 * Fetches the execution count per weekday (last `sinceDays`, default 30).
 */
export async function fetchAutomationWeekdayExecutions(
	automationId: string,
	sinceDays = 30,
): Promise<AutomationWeekdayExecutionCount[]> {
	try {
		const { data } = await apiClient.get<AutomationWeekdayExecutionCount[]>(
			`/automations/${automationId}/executions/by-weekday`,
			{ params: { days: sinceDays } },
		);
		return data;
	} catch (error: unknown) {
		throw handleApplicationError(
			error,
			"Não foi possível carregar as execuções por dia da semana.",
		);
	}
}

/**
 * Sends a request to create a new automation.
 */
export async function createAutomationRequest(
	payload: CreateAutomationPayload,
): Promise<{ message: string; automationId: string }> {
	try {
		const { data } = await apiClient.post<{
			message: string;
			automationId: string;
		}>("/automations", payload);
		return data;
	} catch (error: unknown) {
		throw handleApplicationError(
			error,
			"Falha ao tentar cadastrar a nova automação.",
		);
	}
}

/**
 * Updates the name, rule payload and active status of an existing automation.
 */
export async function updateAutomationRequest({
	id,
	payload,
}: {
	id: string;
	payload: UpdateAutomationPayload;
}): Promise<{ id: string; name: string; isActive: boolean }> {
	try {
		const { data } = await apiClient.put<{
			id: string;
			name: string;
			isActive: boolean;
		}>(`/automations/${id}`, payload);
		return data;
	} catch (error: unknown) {
		throw handleApplicationError(
			error,
			"Não foi possível atualizar a automação.",
		);
	}
}

/**
 * Performs a logical deletion (Soft Delete) of an automation by its ID.
 */
export async function deleteAutomationRequest(id: string): Promise<void> {
	try {
		await apiClient.delete(`/automations/${id}`);
	} catch (error: unknown) {
		throw handleApplicationError(
			error,
			"Não foi possível remover a automação selecionada.",
		);
	}
}
