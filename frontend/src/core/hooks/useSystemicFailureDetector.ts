const SYSTEMIC_FAILURE_THRESHOLD = 2;

export interface QueryHealth {
	isError: boolean;
	refetch: () => void;
}

interface SystemicFailureDetectorResult {
	/** true quando 2+ queries independentes falham ao mesmo tempo (sintoma de outage). */
	isSystemic: boolean;
	failingCount: number;
	/** Dispara refetch em toda query atualmente em erro, de uma vez só. */
	retryAll: () => void;
}

/**
 * Distingue erro local (1 query falhando — bug isolado num endpoint) de
 * falha sistêmica (2+ queries independentes falhando ao mesmo tempo —
 * sintoma de outage de rede/backend) — seção 12.2 de
 * `ui-and-design-system.md`. Agnóstico de domínio: recebe só o par
 * `{ isError, refetch }` de cada query relevante da tela, nunca sabe o que
 * cada uma representa.
 */
export function useSystemicFailureDetector(
	queries: QueryHealth[],
): SystemicFailureDetectorResult {
	const failingCount = queries.filter((query) => query.isError).length;
	const isSystemic = failingCount >= SYSTEMIC_FAILURE_THRESHOLD;

	const retryAll = () => {
		for (const query of queries) {
			if (query.isError) query.refetch();
		}
	};

	return { isSystemic, failingCount, retryAll };
}
