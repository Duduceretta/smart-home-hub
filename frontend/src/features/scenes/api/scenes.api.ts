import { apiClient } from "@/core/api/api.client";
import { handleApplicationError } from "@/core/errors/app.errors";
import type { PagedResponse } from "@/core/types/pagination.types";
import type {
	CreateScenePayload,
	CreateSceneResponse,
	Scene,
	SceneActivationResult,
	SceneDevice,
	UpdateScenePayload,
} from "../types/scenes.types";

/**
 * Extrai a lista de uma resposta paginada ou de um array direto. Cenas e
 * dispositivos por residência são poucos, então uma página grande basta —
 * mesma convenção (pageSize=200) das features `rooms` e `device-groups`.
 */
function unwrapItems<T>(data: PagedResponse<T> | T[] | undefined): T[] {
	if (data && !Array.isArray(data) && Array.isArray(data.items)) {
		return data.items;
	}

	return Array.isArray(data) ? data : [];
}

export interface FetchScenesParams {
	page: number;
	pageSize: number;
	/** Texto livre: nome da cena ou de qualquer dispositivo dela. */
	search?: string;
	/** Nome do ambiente (ou "Sem cômodo"): só cenas com algum dispositivo nele. */
	room?: string | null;
}

/**
 * Busca uma página das cenas do usuário autenticado (ordenadas por nome pela API).
 * Busca e ambiente filtram no servidor, sobre todas as cenas, e a paginação vale
 * sobre o resultado filtrado. Filtro em branco não é enviado.
 */
export async function fetchScenes(
	{ page, pageSize, search, room }: FetchScenesParams,
	signal?: AbortSignal,
): Promise<PagedResponse<Scene>> {
	const trimmedSearch = search?.trim();

	try {
		const { data } = await apiClient.get<PagedResponse<Scene>>("/scenes", {
			params: {
				page,
				pageSize,
				...(trimmedSearch ? { search: trimmedSearch } : {}),
				...(room ? { room } : {}),
			},
			signal,
		});

		return data;
	} catch (error: unknown) {
		throw handleApplicationError(
			error,
			"Não foi possível carregar a lista de cenas.",
		);
	}
}

/**
 * Ambientes que aparecem em alguma cena (inclui "Sem cômodo"), em ordem alfabética,
 * independente da página carregada. Alimenta o filtro de ambiente da lista.
 */
export async function fetchSceneRooms(signal?: AbortSignal): Promise<string[]> {
	try {
		const { data } = await apiClient.get<string[]>("/scenes/rooms", { signal });

		return Array.isArray(data) ? data : [];
	} catch (error: unknown) {
		throw handleApplicationError(
			error,
			"Não foi possível carregar os ambientes das cenas.",
		);
	}
}

/**
 * Busca uma cena pelo id (cena selecionada fora da página atual, tela de edição).
 */
export async function fetchScene(
	id: string,
	signal?: AbortSignal,
): Promise<Scene> {
	try {
		const { data } = await apiClient.get<Scene>(`/scenes/${id}`, { signal });

		return data;
	} catch (error: unknown) {
		throw handleApplicationError(error, "Não foi possível carregar a cena.");
	}
}

/**
 * Cria uma cena. A API recusa sensor, câmera, fechadura e alarme (422) e
 * dispositivo de outro usuário (400) — a mensagem do ProblemDetails sobe como erro.
 */
export async function createSceneRequest(
	payload: CreateScenePayload,
): Promise<CreateSceneResponse> {
	try {
		const { data } = await apiClient.post<CreateSceneResponse>(
			"/scenes",
			payload,
		);
		return data;
	} catch (error: unknown) {
		throw handleApplicationError(
			error,
			"Falha ao tentar cadastrar a nova cena.",
		);
	}
}

/**
 * Substitui nome, ícone e itens da cena (204 sem corpo). Itens ausentes da
 * lista são removidos pela API.
 */
export async function updateSceneRequest({
	id,
	payload,
}: {
	id: string;
	payload: UpdateScenePayload;
}): Promise<void> {
	try {
		await apiClient.put(`/scenes/${id}`, payload);
	} catch (error: unknown) {
		throw handleApplicationError(error, "Não foi possível atualizar a cena.");
	}
}

/**
 * Exclusão lógica (soft delete) da cena. Os dispositivos dela não são afetados.
 */
export async function deleteSceneRequest(id: string): Promise<void> {
	try {
		await apiClient.delete(`/scenes/${id}`);
	} catch (error: unknown) {
		throw handleApplicationError(
			error,
			"Não foi possível remover a cena selecionada.",
		);
	}
}

/**
 * Ativa a cena. Não é transacional: a resposta 200 traz o desfecho por
 * dispositivo (Applied / Failed / Skipped). Cena sem dispositivos volta 422.
 */
export async function activateSceneRequest(
	id: string,
): Promise<SceneActivationResult> {
	try {
		const { data } = await apiClient.post<SceneActivationResult>(
			`/scenes/${id}/activate`,
		);
		return data;
	} catch (error: unknown) {
		throw handleApplicationError(error, "Não foi possível ativar a cena.");
	}
}

/**
 * Dispositivos do usuário para o editor de cena, com o estado atual (usado
 * para pré-preencher o item). Separado da feature `devices` (isolamento FSD).
 */
export async function fetchSceneDevices(
	signal?: AbortSignal,
): Promise<SceneDevice[]> {
	try {
		const { data } = await apiClient.get<
			PagedResponse<SceneDevice> | SceneDevice[]
		>("/devices", { params: { pageSize: 200 }, signal });

		return unwrapItems(data);
	} catch (error: unknown) {
		throw handleApplicationError(
			error,
			"Não foi possível carregar a lista de dispositivos disponíveis.",
		);
	}
}
