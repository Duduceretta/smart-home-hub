import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

const PAGE_PARAM = "page";

export interface UrlPagination<FilterKey extends string> {
	/** Página atual, de 1 em diante. Valor ausente ou inválido na URL vale 1. */
	page: number;
	setPage: (page: number) => void;
	/** Valor atual de cada filtro (`""` quando não está na URL). */
	filters: Record<FilterKey, string>;
	/** Define o filtro e volta para a primeira página; vazio ou `null` remove da URL. */
	setFilter: (key: FilterKey, value: string | null) => void;
}

function parsePage(raw: string | null): number {
	if (raw === null || !/^\d+$/.test(raw)) return 1;

	return Math.max(1, Number(raw));
}

/**
 * Página e filtros de uma listagem guardados na URL (`?page=2&q=luz`): recarregar,
 * voltar e compartilhar o link preservam o estado. Mudar um filtro volta para a
 * primeira página, porque a página antiga pode nem existir mais no resultado novo.
 * Os demais parâmetros da URL (ex.: `?scene=`) são preservados.
 */
export function useUrlPagination<FilterKey extends string>(
	filterKeys: readonly FilterKey[],
): UrlPagination<FilterKey> {
	const [searchParams, setSearchParams] = useSearchParams();

	const page = parsePage(searchParams.get(PAGE_PARAM));

	const filterKeysSignature = filterKeys.join("|");
	const filters = useMemo(() => {
		const values = {} as Record<FilterKey, string>;
		for (const key of filterKeysSignature.split("|").filter(Boolean)) {
			values[key as FilterKey] = searchParams.get(key) ?? "";
		}

		return values;
	}, [filterKeysSignature, searchParams]);

	const setPage = useCallback(
		(nextPage: number) =>
			setSearchParams(
				(previous) => {
					const next = new URLSearchParams(previous);
					if (nextPage <= 1) next.delete(PAGE_PARAM);
					else next.set(PAGE_PARAM, String(nextPage));

					return next;
				},
				{ replace: true },
			),
		[setSearchParams],
	);

	const setFilter = useCallback(
		(key: FilterKey, value: string | null) =>
			setSearchParams(
				(previous) => {
					const current = previous.get(key) ?? "";
					const normalized = value ?? "";
					if (current === normalized) return previous;

					const next = new URLSearchParams(previous);
					if (normalized) next.set(key, normalized);
					else next.delete(key);
					next.delete(PAGE_PARAM);

					return next;
				},
				{ replace: true },
			),
		[setSearchParams],
	);

	return { page, setPage, filters, setFilter };
}
