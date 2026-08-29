import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query";
import { fetchAutomations } from "../api/automations.api";
import type { Automation } from "../types/automations.types";
import {
	type AutomationsListFilters,
	automationsKeys,
} from "./automations.keys";

/**
 * Tamanho do lote buscado por vez — mesmo valor usado como `pageSize`
 * default do backend (`GetAutomationsQuery`). `AutomationListPanel` dispara
 * `fetchNextPage()` de verdade (via IntersectionObserver) quando o sentinel
 * no fim da lista entra em vista, não uma paginação fake sobre um array já
 * carregado.
 */
const PAGE_SIZE = 10;

/**
 * Custom Hook to fetch automations com scroll infinito real — filtro/busca/
 * ordenação (`filters`) são resolvidos server-side e fazem parte da query
 * key, então trocar de filtro reinicia a paginação a partir da página 1
 * automaticamente (comportamento padrão do TanStack Query pra chave nova).
 *
 * `placeholderData: keepPreviousData` evita que trocar de filtro mostre o
 * spinner de tela cheia — sem isso, cada filtro é uma query key nova e
 * `isLoading` volta a `true` a cada clique, o que em `AutomationsView`
 * desmonta `AutomationFilterRail`/lista inteiras (perdendo o hover/estado
 * expandido da trilha) até a resposta chegar. Com isso, a lista antiga fica
 * visível (só `isFetching` liga) enquanto a nova busca roda por trás.
 */
export function useAutomations(filters: AutomationsListFilters = {}) {
	return useInfiniteQuery<
		Awaited<ReturnType<typeof fetchAutomations>>,
		Error,
		Automation[],
		ReturnType<typeof automationsKeys.list>,
		number
	>({
		queryKey: automationsKeys.list(filters),
		queryFn: ({ pageParam }) =>
			fetchAutomations({ ...filters, page: pageParam, pageSize: PAGE_SIZE }),
		initialPageParam: 1,
		getNextPageParam: (lastPage) =>
			lastPage.hasNextPage ? lastPage.page + 1 : undefined,
		select: (data) => data.pages.flatMap((page) => page.items),
		placeholderData: keepPreviousData,
		staleTime: 1000 * 60 * 5,
		retry: 1,
	});
}
