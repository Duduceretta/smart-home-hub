const SYSTEMIC_FAILURE_THRESHOLD = 2;

export interface QueryHealth {
	isError: boolean;
	/** true quando a query tem `data` em cache de um fetch anterior
	 * bem-sucedido — usado pra não contar como "falha sistêmica" uma query
	 * que já está degradando graciosamente (stale-while-revalidate, seção
	 * 12.1 de `ui-and-design-system.md`). Uma query `isError && hasData` tem
	 * conteúdo real na tela (com `StaleDataIndicator`), então não é uma
	 * "falha" pro cálculo de `isSystemic` — só `isError && !hasData` conta. */
	hasData: boolean;
	refetch: () => void;
}

interface SystemicFailureDetectorResult {
	/** true quando 2+ queries falham SEM cache pra mostrar ao mesmo tempo
	 * (sintoma de outage) — queries com cache válido (stale, degradando
	 * graciosamente) nunca contam pra esse cálculo. */
	isSystemic: boolean;
	failingCount: number;
	/** Dispara refetch em toda query atualmente em erro (com ou sem cache), de uma vez só. */
	retryAll: () => void;
}

/**
 * Distingue erro local (1 query sem cache falhando — bug isolado num
 * endpoint) de falha sistêmica (2+ queries independentes sem cache
 * falhando ao mesmo tempo — sintoma de outage de rede/backend) — seção
 * 12.2 de `ui-and-design-system.md`. Agnóstico de domínio: recebe só
 * `{ isError, hasData, refetch }` de cada query relevante da tela, nunca
 * sabe o que cada uma representa.
 */
export function useSystemicFailureDetector(
	queries: QueryHealth[],
): SystemicFailureDetectorResult {
	const failingCount = queries.filter(
		(query) => query.isError && !query.hasData,
	).length;
	const isSystemic = failingCount >= SYSTEMIC_FAILURE_THRESHOLD;

	const retryAll = () => {
		for (const query of queries) {
			if (query.isError) query.refetch();
		}
	};

	return { isSystemic, failingCount, retryAll };
}
